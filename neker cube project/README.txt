neker_cube_app contains an experiment that runs on google app engine

===========================================================
the current project is running here:
(feel free to go to the link and take the experiment)

https://causal-entanglement.ts.r.appspot.com

===========================================================
this link downloads the data as a csv:

https://causal-entanglement.ts.r.appspot.com/vhfiwqe75hg89hgw9o5df8ibysh

===========================================================
you can deploy neker_cube_app to your own account with google app engine

with these commands in the terminal
> gcloud app deploy

===========================================================
test your app locally on your own machine:

open terminal
cd to neker_cube_app
> dev_appserver.py app.yaml
then point your browser to:
http://localhost:8080/ (or whatever port you configured it to be)

access the datastore locally
http://localhost:8000/datastore

access cron jobs locally
http://localhost:8000/cron