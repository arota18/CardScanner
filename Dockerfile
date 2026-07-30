# Stage 1 - Building the Angular WebApp
FROM node:alpine AS build

# Setting the workdir
WORKDIR /app

# Copy the package files to create the nome_modules folder
COPY package.json .npmrc ./

# Generates the nome_modules folder and downloads all the necessary dependencies
RUN npm install

# Copy the rest of the files
COPY . .

# Running npm run build generates the output path folder with the WebApp's files
RUN npm run build --configuration=production

# Stage 2 - Running the application
FROM nginxinc/nginx-unprivileged:alpine AS run

#Changes the user to root to use the chmod command
USER root

# Copy all the files from the output folder of the first stage inside the nginx main folder
COPY --from=build --chown=nginx:nginx /app/dist/card-scanner/browser/ /usr/share/nginx/html

# Copy the nginx basic configuration for an Angular WebApp
COPY --chown=nginx:nginx default.conf /etc/nginx/conf.d/default.conf

# Add the executable flag to the entrypoint script
RUN apk update && apk upgrade

#Changes back to unprivileged user
USER nginx

# Exposes the port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
