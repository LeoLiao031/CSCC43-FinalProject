# CSCC43-FinalProject

# Creating PostGres DB
```
docker run \
    --name cscc43 \
    -p 5432:5432 \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=cscc43 \
    -d postgres
```

# Running Frontend
```
npm run dev
```

# Running Backend
```
npm start
```


# Table Creation
```
- Run the files in express-server/db_population in the order they are numbered
- Insert historical data and stock ticker mapping into db using these csv files
    - https://drive.google.com/drive/folders/1ZrfYs2JyshlDC8vj0XcsExCSw93vyMlE?usp=drive_link
```
