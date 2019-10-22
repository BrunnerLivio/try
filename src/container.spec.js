jest.mock('uuid/v1');

const uuid = require('uuid/v1');
const { getContainerName } = require('./container');


describe('container', () => {
  const uuidString = '1-2-3';

  beforeEach(() => {
    uuid.mockReturnValue(uuidString);
  });

  it('getContainerName', () => {
    expect(getContainerName()).toBe('try-package-1');
  });
});
