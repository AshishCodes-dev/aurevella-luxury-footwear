import mongoose from 'mongoose';
import Address from '../models/Address.js';

/**
 * GET /api/users/addresses
 * Authenticated customer endpoint: returns only addresses owned by the authenticated user
 */
export const getUserAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      status: 'success',
      count: addresses.length,
      addresses: addresses.map((a) => a.toSafeJSON()),
    });
  } catch (error) {
    console.error('[Address Controller - getUserAddresses Error]:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve addresses',
    });
  }
};

/**
 * POST /api/users/addresses
 * Authenticated customer endpoint: creates a new shipping address owned by req.user._id
 */
export const createAddress = async (req, res) => {
  try {
    const {
      recipientName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country = 'India',
      isDefault = false,
    } = req.body;

    const existingCount = await Address.countDocuments({ user: req.user._id });

    // First address for a customer is automatically default
    const shouldBeDefault = isDefault || existingCount === 0;

    if (shouldBeDefault && existingCount > 0) {
      await Address.updateMany(
        { user: req.user._id, isDefault: true },
        { isDefault: false }
      );
    }

    const address = await Address.create({
      user: req.user._id,
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2 ? addressLine2.trim() : '',
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country ? country.trim() : 'India',
      isDefault: shouldBeDefault,
    });

    return res.status(201).json({
      status: 'success',
      address: address.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Address Controller - createAddress Error]:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create shipping address',
    });
  }
};

/**
 * PUT /api/users/addresses/:id
 * Authenticated customer endpoint: updates an existing shipping address owned by req.user._id
 */
export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid address identifier format',
      });
    }

    const address = await Address.findOne({ _id: id, user: req.user._id });
    if (!address) {
      return res.status(404).json({
        status: 'error',
        message: 'Shipping address not found or does not belong to your account',
      });
    }

    const {
      recipientName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body;

    if (recipientName !== undefined) address.recipientName = recipientName.trim();
    if (phone !== undefined) address.phone = phone.trim();
    if (addressLine1 !== undefined) address.addressLine1 = addressLine1.trim();
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2 ? addressLine2.trim() : '';
    if (city !== undefined) address.city = city.trim();
    if (state !== undefined) address.state = state.trim();
    if (postalCode !== undefined) address.postalCode = postalCode.trim();
    if (country !== undefined) address.country = country ? country.trim() : 'India';

    if (isDefault === true && !address.isDefault) {
      await Address.updateMany(
        { user: req.user._id, isDefault: true },
        { isDefault: false }
      );
      address.isDefault = true;
    } else if (isDefault === false && address.isDefault) {
      // Don't un-default if it's the only address
      const count = await Address.countDocuments({ user: req.user._id });
      if (count > 1) {
        address.isDefault = false;
      }
    }

    await address.save();

    return res.status(200).json({
      status: 'success',
      address: address.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Address Controller - updateAddress Error]:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update shipping address',
    });
  }
};

/**
 * DELETE /api/users/addresses/:id
 * Authenticated customer endpoint: deletes an existing shipping address owned by req.user._id
 */
export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid address identifier format',
      });
    }

    const address = await Address.findOne({ _id: id, user: req.user._id });
    if (!address) {
      return res.status(404).json({
        status: 'error',
        message: 'Shipping address not found or does not belong to your account',
      });
    }

    const wasDefault = address.isDefault;
    await address.deleteOne();

    // If the deleted address was default, promote the newest remaining address to default
    if (wasDefault) {
      const remainingNewest = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      if (remainingNewest) {
        remainingNewest.isDefault = true;
        await remainingNewest.save();
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Shipping address removed successfully',
    });
  } catch (error) {
    console.error('[Address Controller - deleteAddress Error]:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete shipping address',
    });
  }
};

/**
 * PATCH /api/users/addresses/:id/default
 * Authenticated customer endpoint: marks a specified address as the primary default
 */
export const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid address identifier format',
      });
    }

    const address = await Address.findOne({ _id: id, user: req.user._id });
    if (!address) {
      return res.status(404).json({
        status: 'error',
        message: 'Shipping address not found or does not belong to your account',
      });
    }

    await Address.updateMany(
      { user: req.user._id, isDefault: true },
      { isDefault: false }
    );

    address.isDefault = true;
    await address.save();

    return res.status(200).json({
      status: 'success',
      address: address.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Address Controller - setDefaultAddress Error]:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to set default shipping address',
    });
  }
};
