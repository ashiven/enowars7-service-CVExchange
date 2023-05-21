FROM python:3.9

# add checker user
RUN useradd -ms /bin/bash -u 1000 checker

USER checker
WORKDIR /checker

COPY ./src/requirements.txt /checker/requirements.txt 
RUN pip3 install -r requirements.txt

COPY ./src /checker/

ENTRYPOINT [ "/home/checker/.local/bin/gunicorn", "-c", "gunicorn.conf.py", "checker:app" ]