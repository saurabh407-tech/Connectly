# API Structure

Base URL: `/api`. All responses: `{ success, message, data }`.

## Implemented
| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Health check |

## Planned
### Auth (`/api/auth`)
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/register` | – | Create account |
| POST | `/login` | – | Log in, returns JWT |
| GET | `/me` | ✔ | Current user |

### Users (`/api/users`)
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/?search=` | ✔ | Search users |
| PUT | `/profile` | ✔ | Update profile |

### Messages (`/api/messages`)
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/:conversationId` | ✔ | Message history |
| POST | `/` | ✔ | Send message |

## Socket events (planned)
`connection`, `disconnect` (done) · `join`, `message:send`, `message:new`, `typing`, `presence:update`
