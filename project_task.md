Take-home task – Software Engineer (Generalist)


Preface

Hi! This exercise is a way for us to understand how you work as a full-stack engineer. Building production-quality software is a process of making trade-offs, structuring code for maintainability, and solving problems creatively. We don't expect a polished product in four hours. We do expect you to show us how you think, how you structure code, and how resourceful you are with limited time. If you have to choose between more features and good code, - choose good code. Include any notes, diagrams, or documentation that showcase your process. If you have questions, contact your hiring point of contact.

Time limit: 4 hours. We will know if you spent significantly more.


What is Crunched?

This is Crunched inside Excel as of December 2025:

[A screenshot of a excel document with a side panel where the crunched agent is operating. This looks similar to what Claude Code looks like or Cursor only in excel.]

Crunched lives in Excel as an add-in downloaded from Microsoft app-source (Add-ins button). It has programmatic access to any functionality a normal Excel user would have, as well as other features, such as the ability to search the web or interact with some of the applications that users typically use in their day-to-day work. Typical Crunched use-cases are building full financial models from scratch, iterating on large existing models, researching autonomously, or finding errors and potential issues in workbooks.

For reference, the actual Crunched stack is:

Frontend: TypeScript, React, Office.js
Backend: Python, FastAPI, LangGraph
 

The task

Build a simplified version of Crunched.

At minimum, a user should be able to open a chat interface in Excel's task pane, send a message to an AI agent, and have the agent read from and write to the spreadsheet. It must be able to interface with workbooks of any size.

How you accomplish this is up to you. Use whatever stack, architecture, and approach you think is best. We care about your reasoning, not a specific implementation pattern.

 

Getting Started

To scaffold an Excel add-in with React, you can use Microsoft's quickstart:

https://learn.microsoft.com/en-us/office/dev/add-ins/quickstarts/excel-quickstart-react

This is optional. Use whatever setup works for you.

Here is an Anthropic API key. Use it as much as you want. [I pasted the key into .env in backend].

 

Pitfalls

Office add-ins run inside a sandboxed WebView controlled by Excel. This WebView enforces strict security: it will not load any content over plain HTTP. Every URL in the manifest, the task pane, icons, commands, must be HTTPS, and the certificate must be trusted by the operating system. This means local development needs two separate trusted certificates: one for the webpack dev server (frontend) and one for the FastAPI/uvicorn server (if you choose to use that).

If you’re building any Office add-in with a local dev server, the trick is the same: use mkcert to create certificates signed by a local CA that gets installed into your OS trust store.

brew install mkcert

mkcert -install                           # creates a local CA and trusts it in macOS Keychain

mkcert localhost 127.0.0.1 ::1         # generates cert + key files

Then point your dev server (webpack, vite, express, uvicorn, whatever) at the generated .pem files. Excel’s WebView will now trust your local HTTPS server. If you use Excel online you might be able to skip this problem, but if you can make it work quickly with desktop Excel, that’s the recommended solution.


Submission

1.    Create a GitHub repository with your solution

2.    Include a README.md with setup instructions and general thoughts