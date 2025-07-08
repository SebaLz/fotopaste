FROM nginx:alpine

# Copy the static files to Nginx's serve directory
COPY . /usr/share/nginx/html/

# Copy a custom Nginx configuration if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"] 