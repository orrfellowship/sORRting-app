function Schedule(candidates, companies, slots, candidate_slots, schedule) {
  var self = this;

  self.candidates = candidates;
  self.companies = companies;
  self.slots = slots;
  self.candidate_slots = candidate_slots;

  if (schedule) {
    self.schedule = schedule;
    return;
  }

  var schedule = [];

  var schedule = new Array(companies.length);
  for (var i = 0; i < companies.length; i++) {
    schedule[i] = new Array(slots);
  }

  // console.log('candidates -- ', candidates);
  // console.log('companies -- ', companies);

  resetCounters(candidates)

  // create randomized list of indexes we can use to get a random company
  var companyIndexes = _.shuffle(_.range(companies.length));
  // create randomized list of indexes we can use to get a random interview slot
  var slotIndexes = _.shuffle(_.range(slots));

  // While not finished, let's loop
  var finished = false;
  var breakout = false
  while(!finished) {

    finished = true;

    // Shuffle the company indexes again
    companyIndexes = _.shuffle(companyIndexes);
    // console.log('companyIndexes -- ', companyIndexes);

    // Loop through the randomized companies
    for (var scheduleIndex=0; scheduleIndex < companies.length; scheduleIndex++) {

      var companyIndex = companyIndexes[scheduleIndex];
      // console.log('companyIndex -- ', companyIndex);
      var company = companies[companyIndex];
      // console.log('company -- ', company);

      // Get the preference list for current company
      var preferences = company.preferences;

      // Shuffle the slot indexes again
      slotIndexes = _.shuffle(slotIndexes);

      // Loop through the randomized slot indexes
      for (var index = 0; index < slots; index++) {

        var slotIndex = slotIndexes[index];

        // if schedule[company][slot] is null
        if (_.isEmpty(schedule[companyIndex][slotIndex])) {

          // Loop through the preference list in order
          for (var counter = 0; counter < preferences.length; counter++) {
            // Verify current candidate has been given an interview
            var candidate = _.findWhere(candidates, { name: preferences[counter] });
            if (!candidate) continue;

            // Verify current candidate has < max interviews
            if (candidate.count < candidate_slots) {
              // if (candidate.name === 'Alex Antonetti') {
              //   console.log('company -- ', company.name);
              //   console.log('candidate schedule -- ', candidate.schedule);
              // }

              // Verify only companies that want a december grad get one
              if (candidate.decGrad && company.decGrad) {
                // Verify current candidate is not already scheduled for that timeslot
                if (isValidAssignment(schedule, companyIndex, slotIndex, candidate, company.name)) {
                  // console.log('slot index -- ', slotIndex);
                  
                  schedule[companyIndex][slotIndex] = candidate.name;
                  candidate.count++;
                  candidate.schedule[slotIndex] = company.name;
                  // console.log('schedule array -- ', schedule[companyIndex]);
                  // console.log('candidate schedule -- ', candidate.schedule);

                  finished = false;
                  breakout = true;
                  break;
                }
              } else if (candidate.decGrad && !company.decGrad) {
                // alert that they got a december Grad?
                // this shouldn't reach this state after manual cleansing

                // Verify current candidate is not already scheduled for that timeslot
                if (isValidAssignment(schedule, companyIndex, slotIndex, candidate, company.name)) {
                  schedule[companyIndex][slotIndex] = candidate.name;
                  candidate.count++;
                  candidate.schedule[slotIndex] = company.name;

                  finished = false;
                  breakout = true;
                  break;
                }
              } else {
                // Verify current candidate is not already scheduled for that timeslot
                if (isValidAssignment(schedule, companyIndex, slotIndex, candidate, company.name)) {
                  schedule[companyIndex][slotIndex] = candidate.name;
                  candidate.count++;
                  candidate.schedule[slotIndex] = company.name;

                  finished = false;
                  breakout = true;
                  break;
                }
              }
            }
          }
          if (breakout) {
            breakout = false;
            break;
          }
        }
      }
    }
  }

  self.schedule = schedule;
}

function isValidAssignment(schedule, companyIndex, slotIndex, candidate, companyName) {
  if (_.contains(schedule[companyIndex], candidate.name)) return false;
  if (_.contains(candidate.schedule, companyName)) return false;

  for (var i=0; i<schedule.length; i++) {
    if (schedule[i][slotIndex] === candidate.name) return false;
  }

  return true;
}

function resetCounters(candidates) {
  _.each(candidates, function(candidate) {
    candidate.count = 0;
  });
}

Schedule.prototype = {};
Schedule.prototype.constructor = Schedule;

Schedule.prototype.score = function(){
  var self = this;
  var score = 0;
  for (var company = 0; company < self.companies.length; company++) {
    var companyScore = 0;
    for (var slot = 0; slot < self.slots; slot++) {
      var current = self.companies[company];
      var preferences = current.preferences;

      var candidate = self.schedule[company][slot];
      if (_.contains(preferences, candidate)) {
        // Fixme: might not always want this to be out of 20
        companyScore += 20 - _.indexOf(preferences, candidate);
      }
    }
    score += companyScore;
  }

	return score;
};

Schedule.prototype.populateCandidates = function(){
  var self = this;
  // console.log('candidates[0].schedule -- ', self.candidates[0].schedule);
  // console.log('companies -- ', self.companies);

  var finished = false;

  var counter = 0;
  while(!finished && counter < 250) {
    ++counter;

    // create randomized list of indexes we can use to get a random company
    var companyIndexes = _.shuffle(_.range(self.companies.length));

    var remaining = [];
    _.each(self.candidates, function(candidate) {
      for (var i=candidate.count; i < self.candidate_slots; i++) {
        remaining.push(candidate);
      }
    });
    // console.log('remaining -- ', remaining);

    var schedule = JSON.parse(JSON.stringify(self.schedule));

    finished = true;

    // Loop through the randomized companies
    for (var scheduleIndex=0; scheduleIndex < self.companies.length; scheduleIndex++) {

      var companyIndex = companyIndexes[scheduleIndex];
      var company = self.companies[companyIndex];

      // Loop through the indexes in order
      for (var slotIndex = 0; slotIndex < self.slots; slotIndex++) {

        // if schedule[company][slot] is null
        if (_.isEmpty(schedule[companyIndex][slotIndex])) {

          var index;
          var count = remaining.length;
          for (var index=0; index < count; index++) {
            var candidate = remaining[index];
            // console.log('candidateName -- ', candidate.name);
            // console.log('candidate schedule -- ', candidate.schedule); 
            
            if (candidate.decGrad && company.decGrad) {
              if (isValidAssignment(schedule, companyIndex, slotIndex, candidate, company.name)) {
                schedule[companyIndex][slotIndex] = candidate.name;
                candidate.schedule[slotIndex] = company.name;
                // candidate.count++;
                remaining.splice(index, 1);
                break;
              }
            } else {
              if (isValidAssignment(schedule, companyIndex, slotIndex, candidate, company.name)) {
                // console.log('candidate -- ', candidate);
                schedule[companyIndex][slotIndex] = candidate.name;
                candidate.schedule[slotIndex] = company.name;
                // candidate.count++;
                remaining.splice(index, 1);
                break;
              }
            }
          }
          console.log('spot still open? -- ', _.isEmpty(schedule[companyIndex][slotIndex]));
          if (index === count) {
  				  finished = false;
  				}
        }
      }
    }
    if (finished) {
      if (!self.validateInterviewCounts()) finished = false;
    }
  }
  self.schedule = schedule;
};

Schedule.prototype.validateInterviewCounts = function(){ return true; };

module.exports = Schedule;
