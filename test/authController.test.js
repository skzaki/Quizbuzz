import { jest } from '@jest/globals';

// Mock dependencies
const mockSession = {
  findOne: jest.fn()
};

const mockJwt = {
  sign: jest.fn()
};

// Mock Models/DB.js
jest.unstable_mockModule('../Backend/Models/DB.js', () => ({
  Session: mockSession,
  User: {},
  Contest: {},
  Submission: {}
}));

// Mock jsonwebtoken
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: mockJwt
}));

// Import the controller after mocking
const { refreshToken } = await import('../Backend/controller/authController.js');

describe('authController - refreshToken', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        userId: 'user123',
        sessionId: 'session456',
        role: 'user',
        email: 'test@example.com',
        userName: 'Test User'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  it('should return 401 if session is not found or inactive', async () => {
    mockSession.findOne.mockResolvedValue(null);

    await refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Session expired or inactive" });
  });

  it('should return a new token if session is valid', async () => {
    mockSession.findOne.mockResolvedValue({ sessionId: 'session456', isActive: true });
    mockJwt.sign.mockReturnValue('new-mock-token');
    process.env.JWT_SECRET = 'testsecret';

    await refreshToken(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      token: 'new-mock-token'
    });
  });
});
