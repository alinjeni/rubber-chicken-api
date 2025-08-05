#!/bin/sh
# wait-for.sh

host="$1"
shift
cmd="$@"

until nc -z "$host" 8000; do
  >&2 echo "DynamoDB is unavailable - sleeping"
  sleep 2
done

>&2 echo "DynamoDB is up - executing command"
exec $cmd
