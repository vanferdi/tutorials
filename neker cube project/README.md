The directory `neker_cube_app` contains an experiment that runs on google app engine

### URL

The current project is running here:

https://causal-entanglement.ts.r.appspot.com

Feel free to follow this link and take the experiment.

### Download data

This link downloads the data as a csv:

https://causal-entanglement.ts.r.appspot.com/vhfiwqe75hg89hgw9o5df8ibysh

### Deploy to app engine

You can deploy neker_cube_app to your own account with google app engine in your terminal with this command:

`> gcloud app deploy`

### Test locally

You can test your app locally on your own machine:

open terminal and cd to neker_cube_app

`> dev_appserver.py app.yaml`

then point your browser to:
http://localhost:8080/ <br>
(or whatever port you configured it to be)

access the datastore locally <br>
http://localhost:8000/datastore

access cron jobs locally <br>
http://localhost:8000/cron