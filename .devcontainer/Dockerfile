FROM node:20

RUN npm install jest gulp typescript -g

WORKDIR /time2blocks

COPY ./.gitconfig /root/.gitconfig
COPY ./.ssh /root/.ssh

ENV LANG C.UTF-8
ENV TZ America/Sao_Paulo

CMD [ "/bin/bash" ]
