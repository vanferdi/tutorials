import webapp2
import logging
from google.appengine.ext import ndb
import csv

class Data(ndb.Model):  # make all be strings since incoming from experiment.js is a string
	condition = ndb.StringProperty()
	order = ndb.StringProperty()
	Q1 = ndb.StringProperty()
	Q2 = ndb.StringProperty()
	Q2ab = ndb.StringProperty()
	image_index = ndb.StringProperty()
	choice_display = ndb.StringProperty()
	resize_events = ndb.StringProperty()
	cube_div_size = ndb.StringProperty()
	device = ndb.StringProperty()

class finishExperiment(webapp2.RequestHandler):
	def post(self):
		logging.info("finishExperiment triggered")
		# create a Data() entity right here
		pdata = Data()

		# then fill it with all the incoming data from experiment.js (the strings are the js variable names)
		pdata.condition = self.request.get('condition')
		pdata.order = self.request.get('order')
		pdata.Q1 = self.request.get('Q1')
		pdata.Q2 = self.request.get('Q2')
		pdata.Q2ab = self.request.get('Q2ab')
		pdata.image_index = self.request.get('image_index')
		pdata.choice_display = self.request.get('choice_display')
		pdata.resize_events = self.request.get('resize_events')
		pdata.cube_div_size = self.request.get('cube_div_size')
		pdata.device = self.request.get('device')

		# save all data to the Datastore
		pdata.put()
		logging.info(pdata)
	
class downloadData(webapp2.RequestHandler):

	def get(self):
		# these headers tell the browser to expect a csv and do whatever it's default procedure is for csvs (Chrome: auto download)
		self.response.headers['Content-Type'] = 'text/csv' 
		self.response.headers['Content-Disposition'] = 'inline;filename=results.csv'
		
		# get every entity of the type Data
		data = Data.query().fetch()

		# Create the header that will contain the csv's column names, in the order you want.  
		# Each one must be a property name from the roundData entity (copy and paste here - must be identical).
		column_names = ['condition','Q2ab','Q2','Q1','image_index','choice_display','order','cube_div_size','resize_events','device']

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
	('/finishExperiment',finishExperiment),
	('/vhfiwqe75hg89hgw9o5df8ibysh', downloadData)
], debug=True)

