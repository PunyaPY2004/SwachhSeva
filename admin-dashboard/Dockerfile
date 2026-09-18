# SwachhSeva admin dashboard — Docker image
# Multi-stage: build the React app with Node, then serve the static
# output with a tiny nginx image (much smaller than shipping Node in prod).

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# VITE_API_BASE_URL is baked in at build time since Vite env vars are
# compiled into the static JS bundle, not read at container runtime.
# Override it with --build-arg if your backend isn't at the default.
ARG VITE_API_BASE_URL=http://localhost:5000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
