This is a full experiment that I ran on google app engine in August 2020
via this url: <br>
zipf-279123.ts.r.appspot.com

After you deploy this experiment to app engine, you have to run some code once to create slots for the participants.  Run the code by entering this url into your browswer: <br>
zipf-279123.ts.r.appspot.com/createSlots

When the participant starts the experiment, they are assigned to a slot, and the slot determines what experimental condition they will be in.

I set up the Datastore slots entities to be a dashboard for monitoring what's going on while participants are taking the experiment.