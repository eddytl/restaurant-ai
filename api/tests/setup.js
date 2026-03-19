const mongoose = require('mongoose');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

afterEach(async () => {
  // Clean all collections between tests
  const cols = Object.values(mongoose.connection.collections);
  await Promise.all(cols.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
