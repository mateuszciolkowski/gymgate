import { describe, it, expect, vi } from 'vitest'
import { getUserById } from './user.service'
import { findUserById } from './user.repository'

vi.mock('./user.repository', () => ({
  findUserById: vi.fn(),
}))

describe('User Service', () => {
  it('should get user by id and exclude password', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'password123',
      phone: '123456789',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(findUserById).mockResolvedValue(mockUser)

    const user = await getUserById('1')

    expect(findUserById).toHaveBeenCalledWith('1')
    expect(user).not.toHaveProperty('password')
    expect(user).toEqual({
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      phone: '123456789',
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
    })
  })

  it('should throw an error if user not found', async () => {
    vi.mocked(findUserById).mockResolvedValue(null)

    await expect(getUserById('1')).rejects.toThrow('User not found')
  })
})
