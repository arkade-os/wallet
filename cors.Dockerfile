FROM nginx:alpine

WORKDIR /etc/nginx
COPY ./cors.nginx.conf ./conf.d/default.conf
EXPOSE 9069
ENTRYPOINT [ "nginx" ]
CMD [ "-g", "daemon off;" ]