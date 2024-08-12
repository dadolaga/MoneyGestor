# MoneyGestor
You can use this application to organize and manage your finances effectively, 
helping you keep track of your expenses, monitor your savings, and ensure your money is always 
under control.

## Developer
For the developer follow [this readme](develop_readme.md)

## Prerequisite
For use this application you must have:
- Java
- Maven
- MySql Server
- Git

## Installation
Before install this application check if all prerequisite are installed, if that's not the case 
install them.

Follow this list:
1. Create a copy of `application.properties.example` present in this folder `src/main/resources/`
to the same folder;
2. Edit the `TODO` in this file:
   - `src/main/resources/application.properties`
   - `src/main/frontend/src/app/axios/axios.ts`
3. Create a new database called "MoneyGestor";
4. Now execute the following command on terminal:
   ```
   mvn install
   ```
5. After previous command success with "BUILD SUCCESS" execute this command to run the application:
   ```
   java -jar ./target/ApiRest-1.0-SNAPSHOT-jar-with-dependencies.jar
   ```
6. Open a web browser and write http://localhost:8093/dashboard to view program and start use it!