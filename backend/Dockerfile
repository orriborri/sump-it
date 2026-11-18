FROM rust:1-bookworm AS build
WORKDIR /app
COPY . .
RUN cargo build --release --locked --bin coffee-brewer-backend

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/coffee-brewer-backend /usr/local/bin/
USER 10001:10001
EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/coffee-brewer-backend"]
