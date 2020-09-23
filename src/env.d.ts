declare namespace NodeJS {
  export interface ProcessEnv {
    PORT: string;
    MONGO_URL: string;
    JWT_SECRET: string;
    NODE_ENV: string;
  }
}
