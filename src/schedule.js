function Schedule(candidates, companies, slots, candidate_slots, schedule) {
//   debugger;
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

//   candidates = reset(candidates);

  // create randomized list of indexes we can use to get a random company
  var companyIndexes = _.shuffle(_.range(companies.length));
  // create randomized list of indexes we can use to get a random interview slot
  var slotIndexes = _.shuffle(_.range(slots));

  // While not finished, let's loop
  var finished = false;
  var breakout = false;
//   debugger;
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
      // console.log('company -- ', JSON.stringify(company));

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
            // console.log('candidate -- ', JSON.stringify(candidate));
            if (!candidate) continue;

            // Verify current candidate has < max interviews
            if (candidate.count < candidate_slots) {

              // Verify only companies that want a december grad get one
              if (candidate.decGrad && company.decGrad) {
                // Verify current candidate is not already scheduled for that timeslot
                if (isValidAssignment(schedule, companyIndex, slotIndex, candidate, company.name)) {
                  // console.log('slot index -- ', slotIndex);
                  schedule[companyIndex][slotIndex] = candidate.name;
                  candidate.count++;
                  candidate.schedule[slotIndex] = company.name;
                  repeatCheck(candidate);

                  // company got one of their top 2 preferences
                  // (nice-to-have from Karyn)
                  if (counter < 2) {
                    company.topPreferences.push(counter+1);
                  }
                  // console.log('schedule array -- ', schedule[companyIndex]);
                  // console.log('candidate schedule -- ', candidate.schedule);

                  finished = false;
                  breakout = true;
                  break;
                }
              } else if (candidate.decGrad && !company.decGrad) {
                continue;
                // Is candidate on company's exception list?
              } else {
                // Verify current candidate is not already scheduled for that timeslot
                if (isValidAssignment(schedule, companyIndex, slotIndex, candidate, company.name)) {
                  schedule[companyIndex][slotIndex] = candidate.name;
                  candidate.count++;
                  candidate.schedule[slotIndex] = company.name;
                  repeatCheck(candidate);

                  // company got one of their top 2 preferences
                  // (nice-to-have from Karyn)
                  if (counter < 2) {
                    company.topPreferences.push(counter+1);
                  }

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

function repeatCheck(candidate) {
  var highestRepeat = 0;
  var repeatCount = 0;
  for (var i = 0; i < candidate.schedule.length; i++) {
    if (candidate.schedule[i] !== null) {
      repeatCount++;
      if (repeatCount > highestRepeat) highestRepeat = repeatCount;
    } else { // interview slot is empty
      repeatCount = 0;
    }
  }

  // var plural = highestRepeat === 1 ? '' : 's';
  if (highestRepeat > 2) {
    candidate.repeats = `${highestRepeat} consecutive`;
  }
}

function reset(candidates) {
  _.each(candidates, function(candidate) {
    candidate.count = 0;
    _.each(candidate.schedule, function(slot) {
      slot = null;
    })
  });
  return candidates;
}

function deepCopy(arrayOfObjects) {
  var arrayCopy = [];
  _.each(arrayOfObjects, function(object, iter) {
    var objectCopy = {};
    objectCopy.count = object.count;
    objectCopy.decGrad = object.decGrad;
    objectCopy.name = object.name;
    objectCopy.repeats = object.repeats;
    objectCopy.schedule = [];
    for (var i=0; i < object.schedule.length; i++) {
      objectCopy.schedule.push(object.schedule[i]);
    }
    arrayCopy.push(objectCopy);
  });
  return arrayCopy;
}

Schedule.prototype = {};
Schedule.prototype.constructor = Schedule;

Schedule.prototype.score = function(){
  var self = this;
  var totalScore = 0;
  var totalPercentage = 0;
  var totalAdjScore = 0;
  for (var company = 0; company < self.companies.length; company++) {
    var companyScore = 0;
    var current = self.companies[company];
    var preferences = current.preferences;
//     debugger;

    for (var slot = 0; slot < self.slots; slot++) {
      var candidate = self.schedule[company][slot];
      if (_.contains(preferences, candidate)) {
        // Fixme: might not always want this to be out of 20
        companyScore += 20 - _.indexOf(preferences, candidate);
      }
    }
    current.companyScore = companyScore;
    current.percentageOfMax = Number((companyScore / current.maxScore).toFixed(4));
    current.adjScore = Number((companyScore * current.percentageOfMax).toFixed(2));

    totalScore += companyScore;
    totalAdjScore += current.adjScore;
    totalPercentage += current.percentageOfMax;
  }

  var avgPercent = Number((totalPercentage / self.companies.length).toFixed(4));

  return {
    score: totalScore,
    adjScore: Number(totalAdjScore.toFixed(0)),
    avgPercent: avgPercent
  }
};

Schedule.prototype.populateCandidates = function(){
  var self = this;
  var originalCandidates = deepCopy(self.candidates);
  // console.log('candidates[0].schedule -- ', self.candidates[0].schedule);
  // console.log('companies -- ', self.companies);

  // FIXME: bug with schedule.candidate.count here
  debugger;

  var finished = false;

  var counter = 0;
  while(!finished && counter < 250) {
    ++counter;
    self.candidates = deepCopy(originalCandidates);

    // create randomized list of indexes we can use to get a random company
    var companyIndexes = _.shuffle(_.range(self.companies.length));

    var remaining = [];
    _.each(self.candidates, function(candidate) {
      for (var i=candidate.count; i < self.candidate_slots; i++) {
        remaining.push(candidate.name);
      }
    });
    debugger;
    // console.log('remaining -- ', remaining);

    var schedule = JSON.parse(JSON.stringify(self.schedule));

    finished = true;

    // Loop through the randomized companies
    for (var scheduleIndex=0; scheduleIndex < self.companies.length; scheduleIndex++) {
      debugger;

      var companyIndex = companyIndexes[scheduleIndex];
      var company = self.companies[companyIndex];

      // Loop through the indexes in order
      for (var slotIndex = 0; slotIndex < self.slots; slotIndex++) {

        // if schedule[company][slot] is null
        if (_.isEmpty(schedule[companyIndex][slotIndex])) {

          var index;
          var count = remaining.length;
          for (var index=0; index < count; index++) {
            var candidate = _.findWhere(self.candidates, { name: remaining[index] });
            // debugger;
            // var candidate = remaining[index];
            // console.log('candidateName -- ', candidate.name);
            // console.log('candidate schedule -- ', candidate.schedule); 
            
            if (candidate.decGrad && company.decGrad) {
              if (isValidAssignment(schedule, companyIndex, slotIndex, candidate, company.name)) {
                schedule[companyIndex][slotIndex] = candidate.name;
                candidate.schedule[slotIndex] = company.name;
                candidate.count++;
                repeatCheck(candidate);
                remaining.splice(index, 1);
                break;
              }
            } else if (candidate.decGrad && !company.decGrad) {
              continue;
              // Is candidate on company's exception list?
            } else {
              if (isValidAssignment(schedule, companyIndex, slotIndex, candidate, company.name)) {
                // console.log('candidate -- ', candidate);
                schedule[companyIndex][slotIndex] = candidate.name;
                candidate.schedule[slotIndex] = company.name;
                candidate.count++;
                repeatCheck(candidate);
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
