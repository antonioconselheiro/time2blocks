FROM node:20

RUN npm install jest gulp typescript -g
RUN apt update && apt install -y curl python && rm -rf /var/lib/apt/lists/*

WORKDIR /time2blocks

COPY ./.gitconfig /root/.gitconfig
COPY ./.ssh /root/.ssh

ENV LANG C.UTF-8
ENV TZ America/Sao_Paulo

# The run the start script
CMD [ "/bin/bash" ]
