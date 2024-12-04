# 2024 BJFU NOSQL Database Course Design --Social Network System

## Introduction

This course is designed to study the design and implementation of social network platform systems.

The main functional modules include user management, friend relationship management, dynamic publishing and interaction, message system, personalized recommendation, search system and data analysis module. By being independent of each other, the modular design is maintained to facilitate subsequent expansion.

The structural design of the system adopts a distributed architecture, combined with the characteristics of NoSQL database, to ensure the efficient operation of each module and data consistency. At the same time, considering the high concurrency requirements, the system integrates caching and message queue services to support real-time data updates and user interaction, and strives to achieve high system response performance and user experience.

Key Features:

- User authentication & authorization
- Post creation & interaction (likes, comments)
- Friend relationship management (follow, friend requests,friend recommendation, social network analysis)
- Real-time private messaging
- Notification system (likes, comments, follows, friend requests)
- Search system (user search, post serach, serach recommendation)
- User profile management
- Image upload & preview
- Online status display
- Data caching optimization

## Demo

This project has not been fully developed and is very crude. I have not yet deployed it to the server. Please use the local view.

Main system pages:

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Development Guide](#development-guide)
- [Contributing](#contributing)

## Tech Stack

### Frontend

- React 18 ![React](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)
- Ant Design Components ![AntDesign](https://img.shields.io/badge/Ant%20Design-1890FF?style=for-the-badge&logo=antdesign&logoColor=white)
- Redux State Management ![Redus](https://img.shields.io/badge/Redux-593D88?style=for-the-badge&logo=redux&logoColor=white)
- Axios HTTP Client ![Axios](https://img.shields.io/badge/axios-671ddf?&style=for-the-badge&logo=axios&logoColor=white)
- Socket.IO Client

### Backend

- Node.js ![NodeJs](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
- Express Framework ![Express](https://img.shields.io/badge/Express%20js-000000?style=for-the-badge&logo=express&logoColor=white)
- MongoDB Database ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
- Redis Cache ![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?&style=for-the-badge&logo=redis&logoColor=white)
- Neo4j Relationships ![Neo4j](https://img.shields.io/badge/Neo4j-018bff?style=for-the-badge&logo=neo4j&logoColor=white)
- JWT Authentication ![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)
- Socket.IO

## Project Structure

```
├── client                     # Frontend directory
│   ├── public                # Static assets
│   └── src                   # Source code
│       ├── components        # React components
│       │   ├── Auth         # Authentication components
│       │   ├── Layout       # Layout components
│       │   ├── Posts        # Post-related components
│       │   ├── Profile      # Profile components
│       │   ├── Friends      # Friend-related components
│       │   └── Messages     # Messaging components
│       ├── pages            # Page components
│       ├── utils            # Utility functions
│       └── styles           # Style files
├── server                    # Backend directory
│   ├── controllers          # Route controllers
│   ├── models               # Database models
│   ├── routes              # API routes
│   ├── middleware          # Custom middleware
│   ├── services            # Business logic services
│   └── utils               # Utility functions
```

## Installation

### Requirements

- Node.js 14+
- MongoDB 4.4+
- Redis 6.0+

### Setup Steps

1. Clone repository

```
git clone https://github.com/yourusername/social-network.git
cd social-network
```

2. Install dependencies

```
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

3. Configure environment variables

```
# server/.env
Configure the appropriate port on your local premises
```

4. Start the application

```
# Start backend server
cd server
npm start

# Start frontend development server
cd ../client
npm start
```

Visit http://localhost:3000 to view the application

**If you need data testing for this course design, please contact me huangyukun@bjfu.edu.cn**

## Development Guide

### Code Standards

- ESLint for code linting
- Follow Airbnb JavaScript Style Guide
- Prettier for code formatting

### Development Workflow

1. Create feature branch
2. Develop new features
3. Test before commit
4. Create Pull Request
5. Code Review
6. Merge to main branch

## Contributing

Contributions via Issues and Pull Requests are welcome.

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to remote branch
5. Create Pull Request

## License

MIT License
