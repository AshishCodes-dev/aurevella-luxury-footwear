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
