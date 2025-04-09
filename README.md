# CSCC43-FinalProject

# Creating PostGres DB
```
docker run \
    --name postgres \
    -p 5432:5432 \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=cscc43 \
    -d postgres
```
