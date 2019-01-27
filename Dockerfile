FROM node:11-alpine

LABEL "com.github.actions.name"="Assign size label"
LABEL "com.github.actions.description"="Assign labels based on pull request change sizes"
LABEL "com.github.actions.icon"="tag"
LABEL "com.github.actions.color"="blue"

COPY . /tmp/src/

RUN yarn global add "file:/tmp/src" && rm -rf /tmp/src

ENTRYPOINT [ "size-label-action" ]
