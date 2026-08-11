# Build context is expected to be the `backend/` directory, e.g.:
#   docker build -f AssignmentSystem.Api/Dockerfile -t assignment-system-api .
# (Render's Docker runtime does this automatically when dockerContext is set in render.yaml.)

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore only the API project (not the test project) so the published image stays lean and restore
# can be cached independently of the rest of the source tree.
COPY AssignmentSystem.Api/AssignmentSystem.Api.csproj AssignmentSystem.Api/
RUN dotnet restore AssignmentSystem.Api/AssignmentSystem.Api.csproj

COPY AssignmentSystem.Api/ AssignmentSystem.Api/
RUN dotnet publish AssignmentSystem.Api/AssignmentSystem.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Render (and most container PaaS platforms) inject PORT at runtime; Program.cs reads it and binds
# Kestrel accordingly. This default only matters for `docker run` without an explicit -e PORT=....
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "AssignmentSystem.Api.dll"]
