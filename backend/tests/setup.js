const mongoose = require('mongoose');

jest.setTimeout(60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
