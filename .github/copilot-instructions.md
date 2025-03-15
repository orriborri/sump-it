Notice: For now, we are following these naming conventions and folder structure in the new platform React app. Over time, we will evaluate whether to adopt these rules for other projects.

This documentation describes the naming conventions and the folder structure we follow.\
Structure has been derived from the DDD (https://en.wikipedia.org/wiki/pages-driven_design) (pages Driven Design).

- Folder structure
- Naming files and folder

## Naming files and folders

- Folders are always in lower camel case: /src, /pages and /fooBar.
- React component files (`.jsx` and .tsx`) are named in upper camel case: `User.tsx, App.jsx and FooBar.tsx.
- Normal JavaScript and TypeScript files are named in lower camel case: utils.ts, index.js and fooBar.ts.
- Markdown files (`.md`) are named in spinal-case: foo-bar.md.
  - The only exception to this is the readme file which is named in all capital letters: README.md.
- Rest of the files e.g. css, json and html files are named in lower camel case: style.css, fooBar.sass and index.html.
- Test files follow the naming pattern of the file it tests: User.test.ts, utils.test.ts and fooBar.test.ts

## Folder structure

Root of the /src -folder is divided into /common and /app.

<details open>
<summary>Example</summary>

/app
  /pages
/common
/lib
</details>

### pages

/pages -folder contains all files that are connected into the business logic.

Files are divided into folders under pages by entity name e.g. /user, /campaign and /location.

### Common

/common -folder contains all files that are not directly connected into business logic e.g. button, modal and form fields.\
If you could imagine sharing a component between projects and maybe even creating a standalone library/module out of it, then it probably should be located under /common -folder.

<details open>
<summary>Example</summary>

#### Example of how files are divided into folders.

_Sub folders can be created if needed so that the file list in a folder doesn't grow into too large as long as the context is clear._

/app
  /common
    /button
      Button.tsx
      Button.test.ts
      button.css
    /modal
      Modal.tsx
      Modal.test.ts
      modal.css
      utils.ts
      utils.test.ts
      
  /pages
    /user
      /create
        Page.tsx
        CreateUser.test.ts
        createUser.css
      /list
        Page.tsx
        UserList.test.ts
        userList.css
      Page.tsx
      User.test.ts
      utils.ts
      utils.test.ts
      user.css
    /campaign
      pages.tsx
      Campaign.test.ts

</details>