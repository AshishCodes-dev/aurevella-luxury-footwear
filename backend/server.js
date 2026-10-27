import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { validateAuthConfig, initFirebase } from './src/config/firebase.js';
import { ensureLaunchCatalogue } from './src/utils/seedProducts.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Validate JWT configuration
    validateAuthConfig();

    // Initialize Firebase Admin SDK if environment variables are present
    initFirebase();

    // Connect to MongoDB
    await connectDB();

    // Ensure canonical launch models (prod-01, prod-02, prod-03) exist in the atelier catalogue.
    // Non-destructive: preserves all existing client modifications, custom prices, stock, and active status.
    await ensureLaunchCatalogue();

    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
