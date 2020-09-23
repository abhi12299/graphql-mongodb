import DataLoader from 'dataloader'
import { User, UserModel } from '../entities/User'

// ["abhi", ...]
// [{}, ...]
export const createUserLoader = () =>
  new DataLoader<string, User | undefined>(async (usernames) => {
    const users = await UserModel.find({
      username: {
        $in: usernames as string[],
      },
    })

    const usernamesToUser: Record<string, User> = {}
    users.forEach((u) => (usernamesToUser[u.username] = u))

    return usernames.map((u) => usernamesToUser[u] || undefined)
  })
