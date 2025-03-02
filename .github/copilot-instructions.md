In react we should only have one component per file. In addion we should have the component file start with an big letter and the rest should have small starting letters.

The code logic should be split off to custom hooks and serverside functions in all places where it is possible.

We are also splitting componenst to common folders and to context folders. In the context folder we should only have buissness logic related components the rest should be in the common folder. One execption to this is the Page.tsx file, this is the next.js way of dooing it and it should be in the same folder as the rest of the buisness code.

In this project we are also using kysely so we should use type saftey the whole way true the project.
We should run pnpm run lint and fix the problems there.

for import we want to use the @ decorator, these are definde in the tsconfig.json [./tsconfig.json]

This is an next.js project, here we need to keep track of what code should run in the front end and what should be in the backend. If it for example a database call, it should be runned on the server side whit:
'use server' in the top of the window

We the project should use postgres as defined in /home/orre/sump-it/app/lib/database.ts 

Tests
=====
I want to have 100% test coverage but so that we ingore the code that can't be tested resonably. The comonents should be tested for the logic and so that they actually renders, we should react testing library and vitest for this. We should try to avoid mocks where ever we can. Instead of mocking we should do refactoring of the code. And we should  test the actual functunalite and not the implementaion.
