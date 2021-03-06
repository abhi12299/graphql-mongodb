# TypeScript GraphQL MongoDB Starter

The main purpose of this repository is to show a working GraphQL API Server with Typescript and MongoDB.

# Features

- MongoDB with Typegoose
- Query Caching with Cache Hints and Scope
- Redis for apollo query caching
- Sentry error reporting and optional performance tracking
- JWT authentication
- Query batching and caching using dataloader
- Custom error handling and formatting in Apollo server
- Simple subscriptions example with Redis backed pub-sub

# Table of contents:

- [Pre-reqs](#pre-reqs)
- [Getting started](#getting-started)
- [Deploying the app](#deploying-the-app)
- [Authentication](#authentication)
- [Queries](#queries)
- [Mutations](#mutations)
- [Further development](#further-development)
  - [Generating types for environment variables](#generating-types-for-environment-variables)
  - [Extending the current data model](#extending-the-current-data-model)
  - [Working with query caching](#working-with-query-caching)

# Pre-reqs

To build and run this app locally you will need a few things:

- Install [Node.js](https://nodejs.org/en/)
- Install [MongoDB](https://docs.mongodb.com/manual/installation/)

# Getting started

- Clone the repository

```
git clone https://github.com/abhi12299/graphql-mongodb.git <project_name>
```

- Install dependencies

```
cd <project_name>
yarn # or npm i
```

- Configure your mongoDB server (for first time setup)

```bash
# create the db directory
sudo mkdir -p /data/db
# give the db correct read/write permissions
sudo chmod 777 /data/db

# starting from macOS 10.15 even the admin cannot create directory at root
# so lets create the db directory under the home directory.
mkdir -p ~/data/db
# user account has automatically read and write permissions for ~/data/db.
```

- Start your mongoDB server (you'll probably want another command prompt)

```bash
mongod

# on macOS 10.15 or above the db directory is under home directory
mongod --dbpath ~/data/db
```

- Setup environment variables

```bash
touch .env
cp .env.example .env
```

Following are the environment variables: <br>
`PORT` is the port on which the server runs.<br>
`MONGO_URL` is the MongoDB connection string, for e.g. `MONGO_URL=mongodb://localhost/test`<br>
`JWT_SECRET` can be any random string used to sign JWT for authentication.<br>
`SENTRY_DSN` is the DSN for sentry used to report errors. Get a DSN [here](https://sentry.io/)<br>
`REDIS_HOST` is hostname for the redis, e.g. `127.0.0.1`<br>
`REDIS_PORT` is port for redis, e.g. `6379`

- Run the project locally for development

```bash
yarn watch # typescript watching files for changes
yarn dev
```

- Open the URL given by the application in the browser for GraphQL Playground

# Deploying the app

- Set `NODE_ENV=production` in `.env`

- Build the project

```bash
yarn build
```

- Start the app in production

```bash
yarn start
```

## Project Structure

TypeScript (`.ts`) files live in your `src` folder and after compilation are output as JavaScript (`.js`) in the `dist` folder.

The full folder structure of this app is explained below:

| Name                 | Description                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| **dist**             | Contains the distributable (or output) from your TypeScript build. This is the code you ship                    |
| **node_modules**     | Contains all your npm dependencies                                                                              |
| **src**              | Contains your source code that will be compiled to the dist dir                                                 |
| **src/entities**     | Mongoose collection types represented as Typescript classes using Typegoose                                     |
| **src/middleware**   | Middleware for express server and type-graphql resolvers                                                        |
| **src/resolvers**    | Contains GraphQL resolvers.                                                                                     |
| **src/utils**        | Utility helper functions                                                                                        |
| **src**/constants.ts | Contains constants that the app uses and custom error record that maps different error codes to error responses |
| **src**/index.ts     | Entry point for the server                                                                                      |
| **src**/env.d.ts     | Type definitions for environment variables                                                                      |
| **src**/types.ts     | Enums and custom types that the app uses                                                                        |
| .env.example         | API keys, tokens, passwords, database URI. Clone this, but don't check it in to public repos.                   |
| package.json         | File that contains npm dependencies as well as                                                                  |
| tsconfig.json        | Config settings for compiling server code written in TypeScript                                                 |
| .prettierrc          | Code formatting rules for prettier                                                                              |

## Authentication

The project uses JWT for authentication. The server performs authentication using Bearer token format. Get the access token for the user (using the `createUser` or `login` mutation) and set the HTTP `Authorization` header as `Bearer <your-token>`. <br>
From the GraphQL Playground, you can set this header by clicking on the HTTP Headers section in the bottom and then pasting the following:

```json
{
  "Authorization": "Bearer <your-token>"
}
```

> You can also send the access token in query parameter as well, like so `?token=<your-token>`

**Note:** All subscriptions by default require authentication. From the GraphQL playground, set the authorization header using the same format. From apollo client, you can set [connection params.](https://www.apollographql.com/docs/react/data/subscriptions/#4-authenticate-over-websocket-optional)

## Queries

```graphql
query {
  hello
}

query {
  me {
    username
  }
}

query {
  posts(opts: { limit: 5, cursor: "" }) {
    posts {
      _id
      author {
        username
      }
      title
      createdAt
      updatedAt
    }
    hasMore
  }
}
```

## Mutations

```graphql
mutation {
  createUser(username: "abc", password: "abcd") {
    user {
      username
      _id
    }
    errors {
      field
      message
    }
  }
}

mutation {
  login(username: "abcd", password: "abcd") {
    errors {
      field
      message
    }
    accessToken
  }
}

mutation {
  createPost(title: "233333") {
    title
    author {
      username
    }
  }
}
```

## Subscriptions

```graphql
subscription {
  newPost {
    title
    author {
      username
    }
  }
}
```

# Further development

### Generating types for environment variables

Whenever you change environment variables in the project, run `yarn gen-env` to update the typescript types for them.

> **Note** that the script does not take into account optional environment variables. You have to add types for them yourself. See `SENTRY_DSN` in `src/env.d.ts` for example.

### Extending the current data model

In Typegoose, you create new collections by creating typescript classes for them and decorating the class properties. You can read more about it [here](https://typegoose.github.io/typegoose/docs/guides/quick-start-guide)

### Working with query caching

Apollo queries caching is governed by cache hints that are added to the scema manually. There are 2 types of cache hints, namely `scope` and `maxAge`.
<br>

`maxAge` specifies the time in seconds to cache the query result for. As for `scope`, there are two possibe values for it -

1. `PUBLIC` - used when a query result is independent of variables such as a user session. Use this to cache results that are global, for example comments on a post or user profiles.
2. `PRIVATE` - This can be used to cache queries whose response is different for different users.
   <br>

Read more about Apollo query caching [here](https://www.apollographql.com/docs/apollo-server/performance/caching/)

> **Note:** You need to provide scope for each subfield in the query for the cache control headers to be properly set. See `src/resolvers/post.ts` for an example.

## License
Licensed under the MIT License.
