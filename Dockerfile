FROM node:18.14.2 as frontend-builder

# FRONTEND
# install npm packages
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json frontend/tsconfig.json ./
RUN npm install

# production build
COPY frontend/public ./public
COPY frontend/src ./src
RUN npm run build


FROM node:18.14.2 as runner

## BACKEND
# install npm packages
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
RUN npm install ts-node

# copy production build from frontend-builder
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# copy server files 
COPY src ./src
COPY scripts ./scripts

# run server
ENTRYPOINT ["npm", "run" ,"production"]