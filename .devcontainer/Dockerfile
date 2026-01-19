FROM node:22

RUN npm install jest typescript -g

RUN apt update
RUN apt install -y jq

# Clean
RUN apt clean
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /time2blocks

# Keyboard & Timezone
ENV LANG=C.UTF-8
ENV LANGUAGE=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV TZ=America/Sao_Paulo
ENV DEBUG_COLORS=true
ENV FORCE_COLOR=true
ENV NG_CLI_COMPLETION=false

CMD [ "/bin/bash" ]
