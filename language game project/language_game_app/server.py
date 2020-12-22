import webapp2
import logging
from google.appengine.ext import ndb
import csv
import time

N_slots = 500  # set to a really high number, do 500

class Slot(ndb.Model):
	slot = ndb.IntegerProperty()
	condition = ndb.IntegerProperty()  # 0 = no memory wipe, 1 = memory wipe
	status = ndb.StringProperty() # 3 values: "available", "DONE", "busy: +timestamp"
	created = ndb.StringProperty()

class Data(ndb.Model):  # make all be strings since incoming from experiment.js is a string
	slotID = ndb.StringProperty()
	condition = ndb.StringProperty()
	age = ndb.StringProperty()
	gender = ndb.StringProperty()
	langs = ndb.StringProperty()
	years = ndb.StringProperty()
	strategies = ndb.StringProperty()
	c_code = ndb.StringProperty()
	robotA_ID = ndb.StringProperty()
	transmit_speed = ndb.StringProperty()
	Q1 = ndb.StringProperty()
	Q2 = ndb.StringProperty()
	Q3_round1 = ndb.StringProperty()
	Q3_round2 = ndb.StringProperty()
	Q4_round1 = ndb.StringProperty()
	Q4_round2 = ndb.StringProperty()
	Q5_round1 = ndb.StringProperty()
	Q5_round2 = ndb.StringProperty()
	score_round1 = ndb.StringProperty()
	total_transmit_seconds_round1 = ndb.StringProperty()
	score_round2 = ndb.StringProperty()
	total_transmit_seconds_round2 = ndb.StringProperty()
	images_map = ndb.StringProperty()
	longword_map = ndb.StringProperty()
	meaning_map_round1 = ndb.StringProperty()
	meaning_map_round2 = ndb.StringProperty()
	train_meanings_round1 = ndb.StringProperty()
	train_words_round1 = ndb.StringProperty()
	train_meanings_round2 = ndb.StringProperty()
	train_words_round2 = ndb.StringProperty()
	meanings_round1 = ndb.StringProperty()
	signals_round1 = ndb.StringProperty()
	guesses_round1 = ndb.StringProperty()
	botguessed_round1 = ndb.StringProperty()
	accuracy_round1 = ndb.StringProperty()
	short_sides_round1 = ndb.StringProperty()
	F_sides_round1 = ndb.StringProperty()
	human_roles_round1 = ndb.StringProperty()
	meanings_round2 = ndb.StringProperty()
	signals_round2 = ndb.StringProperty()
	guesses_round2 = ndb.StringProperty()
	botguessed_round2 = ndb.StringProperty()
	accuracy_round2 = ndb.StringProperty()
	short_sides_round2 = ndb.StringProperty()
	F_sides_round2 = ndb.StringProperty()
	human_roles_round2 = ndb.StringProperty()
	time_started = ndb.StringProperty()
	time_finished = ndb.StringProperty()


# when you set up the experiment to run, only run this url once!
class createSlots(webapp2.RequestHandler):
	def get(self):

		# alternating condition values ensure that both conditions fill up equally as participants sign on
		for i in range(1,N_slots+1):
			if (i % 2) == 0: # if i is even
				Slot(slot=i,condition=1,status="available",created=time.strftime('%X %x %Z')).put()
			else:            # if i is odd
				Slot(slot=i,condition=0,status="available",created=time.strftime('%X %x %Z')).put()


class joinExperiment(webapp2.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/plain'

		logging.info("join Experiment triggered")

		# choose the first available slot (in order of slot number)
		candidate = []                                         # save each candidate slot here
		match = ""                                             # save the correct match here, if no match, stays with this init value
		for i in range(1,N_slots+1):                           # go through each slot in order
			candidate = Slot.query(Slot.slot == i).fetch()[0]  # get that slot (use [0] to pull it out)
			if candidate.status == "available":                # check if that slot is available, if not pull the next match
				match = candidate
				break                                      # if so, stop here - the variable match contains your match	

		if match != "":
			# write values to the datastore
			time_started = time.strftime('%X %x %Z')
			match.status = time_started # save status as current time, meaning status = busy
			match.put() # save that re-write to datastore

			# get the variables you want from the slot entity
			the_id = match.key.id() # save the id 
			condition = match.condition  # save the condition

			logging.info("the participant will do this slot: "+str(match))

			# send values you got from the datastore to experiment.js
			self.response.write(str(the_id)+";"+str(condition)+";"+str(time_started)) # use a unique separator symbol for js to parse
		else:
			self.response.write("") # then send an empty string


class finishExperiment(webapp2.RequestHandler):
	def post(self):
		# create a Data() entity right here
		pdata = Data()

		# then fill it with all the incoming data from experiment.js (the strings are the js variable names)
		pdata.slotID = self.request.get('entityID')
		pdata.condition = self.request.get('condition')
		pdata.age = self.request.get('age')
		pdata.gender = self.request.get('gender')
		pdata.langs = self.request.get('langs')
		pdata.years = self.request.get('years')
		pdata.strategies = self.request.get('strategies')
		pdata.c_code = self.request.get('c_code')
		pdata.robotA_ID = self.request.get('robotA_ID')
		pdata.transmit_speed = self.request.get('transmit_speed')
		pdata.Q1 = self.request.get('Q1')
		pdata.Q2 = self.request.get('Q2')
		pdata.Q3_round1 = self.request.get('Q3_round1')
		pdata.Q3_round2 = self.request.get('Q3_round2')
		pdata.Q4_round1 = self.request.get('Q4_round1')
		pdata.Q4_round2 = self.request.get('Q4_round2')
		pdata.Q5_round1 = self.request.get('Q5_round1')
		pdata.Q5_round2 = self.request.get('Q5_round2')
		pdata.score_round1 = self.request.get('score_round1')
		pdata.total_transmit_seconds_round1 = self.request.get('total_transmit_seconds_round1')
		pdata.score_round2 = self.request.get('score_round2')
		pdata.total_transmit_seconds_round2 = self.request.get('total_transmit_seconds_round2')
		pdata.images_map = self.request.get('images_map')
		pdata.longword_map = self.request.get('longword_map')
		pdata.meaning_map_round1 = self.request.get('meaning_map_round1')
		pdata.meaning_map_round2 = self.request.get('meaning_map_round2')
		pdata.train_meanings_round1 = self.request.get('train_meanings_round1')
		pdata.train_words_round1 = self.request.get('train_words_round1')
		pdata.train_meanings_round2 = self.request.get('train_meanings_round2')
		pdata.train_words_round2 = self.request.get('train_words_round2')
		pdata.meanings_round1 = self.request.get('meanings_round1')
		pdata.signals_round1 = self.request.get('signals_round1')
		pdata.guesses_round1 = self.request.get('guesses_round1')
		pdata.botguessed_round1 = self.request.get('botguessed_round1')
		pdata.accuracy_round1 = self.request.get('accuracy_round1')
		pdata.short_sides_round1 = self.request.get('short_sides_round1')
		pdata.F_sides_round1 = self.request.get('F_sides_round1')
		pdata.human_roles_round1 = self.request.get('human_roles_round1')
		pdata.meanings_round2 = self.request.get('meanings_round2')
		pdata.signals_round2 = self.request.get('signals_round2')
		pdata.guesses_round2 = self.request.get('guesses_round2')
		pdata.botguessed_round2 = self.request.get('botguessed_round2')
		pdata.accuracy_round2 = self.request.get('accuracy_round2')
		pdata.short_sides_round2 = self.request.get('short_sides_round2')
		pdata.F_sides_round2 = self.request.get('F_sides_round2')
		pdata.human_roles_round2 = self.request.get('human_roles_round2')
		pdata.time_started = self.request.get('time_started')

		# add the current time, to log the time that the data was written
		pdata.time_finished = time.strftime('%X %x %Z')

		# save all data to the Datastore
		pdata.put()
		logging.info(pdata)

		# update the Slot entity
		entity = Slot.get_by_id(int(pdata.slotID)) # get the correct entity by its id
		entity.status = "DONE"
		entity.put()
		logging.info(entity)

		


class downloadData(webapp2.RequestHandler):

	def get(self):
		# these headers tell the browser to expect a csv and do whatever it's default procedure is for csvs (Chrome: auto download)
		self.response.headers['Content-Type'] = 'text/csv' 
		self.response.headers['Content-Disposition'] = 'inline;filename=results.csv'
		
		# get every entity of the type Data
		data = Data.query().fetch()

		# Create the header that will contain the csv's column names, in the order you want.  
		# Each one must be a property name from the roundData entity (copy and paste here - must be identical).
		column_names = ['c_code','slotID','condition','time_started','time_finished','transmit_speed','images_map','longword_map','meaning_map_round1','meaning_map_round2','robotA_ID','age','gender','langs','years','strategies','Q1','Q2','Q3_round1','Q3_round2','Q4_round1','Q4_round2','Q5_round1','Q5_round2','score_round1','score_round2','total_transmit_seconds_round1','total_transmit_seconds_round2','train_meanings_round1','train_meanings_round2','train_words_round1','train_words_round2','meanings_round1','meanings_round2','signals_round1','signals_round2','guesses_round1','guesses_round2','botguessed_round1','botguessed_round2','accuracy_round1','accuracy_round2','short_sides_round1','short_sides_round2','F_sides_round1','F_sides_round2','human_roles_round1','human_roles_round2']

		writer = csv.DictWriter(self.response.out, fieldnames=column_names) # use property names as the column names
		writer.writeheader() # write the row of column names in the csv

		# now fill the csv with one entity per row
		for e in data:
			d = dict()
			try:
				for k, v in e._properties.iteritems():
					d[k] = str(v._get_user_value(e))
				writer.writerow(d)
			except UnicodeEncodeError:
				logging.error("UnicodeEncodeError detected, row ignored");



app = webapp2.WSGIApplication([
	('/createSlots',createSlots),
	('/joinExperiment',joinExperiment),
	('/finishExperiment',finishExperiment),
	('/[your_download_data_code_here]', downloadData)
], debug=True)

