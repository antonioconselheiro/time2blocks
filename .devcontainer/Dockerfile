FROM node:20

RUN npm install jest typescript -g

RUN apt update && \
    apt install -y jq && \
    apt clean

WORKDIR /time2blocks

COPY ./.gitconfig /root/.gitconfig
COPY ./.ssh /root/.ssh
RUN chmod 600 -R /root/.ssh
RUN ssh-add -D && ssh-add /root/.ssh/id_ed25519 || true

ENV LANG C.UTF-8
ENV TZ America/Sao_Paulo

CMD [ "/bin/bash" ]
