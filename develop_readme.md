# Developer guide
This guide is for only developers that they want develop and change the program

## Prerequisite
The prerequisite are the same as for non-developer users, but we recommend installing
the following programs:
- IDE for develop TypeScript and React, for example VS Code;
- IDE for develop Java, for example IntellJ Idea;
- Database viewer, for example DbVisualizer;

## Installation
Before install this application check if all prerequisite are installed, if that's not the case
install them.

Follow this list:
1. Create a copy of `application.properties.example` present in this folder `src/main/resources/`
   to the same folder;
2. Edit the `TODO` in this file:
    - `src/main/resources/application.properties`
    - `src/main/frontend/src/app/axios/axios.ts`
    - `src/main/java/org/laga/moneygestor/services/controller/WebConfig.java` remove comment at line 9
   (remove only the first comment `//` NOT entire row)
3. Create a new database called "MoneyGestor";

### Full stack & backend developer
4. Open this folder in a Java IDE;
5. Run the backend; 
6. Open the folder `src/main/frontend` in TypeScript IDE; 
7. Open terminal and go to this folder `src/main/frontend`; 
8. Execute the following command to install all dependencies:
   ```
   npm init
   ```
9. Execute the following command to run the frontend:
   ```
   npm run dev
   ```
10. Open a web browser and write http://localhost:3000/dashboard to view program!

When you edit the backend you must be restart the backend app [5.], but if you edit the frontend
you only must be save the file and the change is immediately show on your browser.

### Frontend developer
4. Open terminal; 
5. Now execute the following command on terminal:
   ```
   mvn install
   ```
6. After previous command success with "BUILD SUCCESS" execute this command to run the application:
   ```
   java -jar ./target/ApiRest-1.0-SNAPSHOT-jar-with-dependencies.jar
   ```
7. Open the folder `src/main/frontend` in TypeScript IDE; 
8. Open terminal and go to this folder `src/main/frontend`;
9. Execute the following command to run the frontend:
   ```
   npm run dev
   ```
10. Open a web browser and write http://localhost:3000/dashboard to view program!

When you edit the frontend only must be save the file and the change is immediately show on your browser.

## When you update the app
When you update the app, or marge your developer branch with the `dev` or `main` branch we suggest 
to following this action:
- Check if file, cited in "Installation" step 2, have your edit;
- Drop and after create the "MoneyGestor" database (ATTENTION: this procedure cancel or data have 
  you insert. Execute this procedure only on developer machine);
- [Only for frontend developer] recompile java app following 4 - 6 step in "Installation - 
  Frontend developer"