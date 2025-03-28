# code-demos

A collection of small projects that demonstrates code solutions to problems I've encountered in the past

## Packages
- local-sync:
  - Problem: Sometimes we come across errors for specific records in deployed environments that are not easy to debug. Could be that we're missing some key observability technologies or have not been generous with our debug logs. It would be easy to just pull the problematic records into our local environments so that we can debug the record by stepping through the code.
  - Solution: A local script that takes in a read only connection url string to a remote postgres database. The script will fetch the asset records and the related tables and upsert them into your local database
  - Pros: 
    - Easily pull in records from deployed environments to your local 
    - The logic of how tables are related to each other are in one place
  - Cons:
    - Requires maintenance if any relationships change or if any new tables are added

```
The local-sync package has not been run or tested. This is a TODO on my list.
```