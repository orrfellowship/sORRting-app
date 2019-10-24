self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js');
var Schedule = require('./schedule');

self.onmessage = function (msg) {
  switch (msg.data.aTopic) {
    case 'load':
      var dec = new TextDecoder();
      var data = JSON.parse(dec.decode(msg.data.aBuf));
      main(data)
      break;
    case 'populate':
      var dec = new TextDecoder();
      var data = JSON.parse(dec.decode(msg.data.aBuf));
      // console.log('new data returned -- ', data);
      populateCandidates(data);
      break;
    default:
      throw 'no aTopic on incoming message to ChromeWorker';
  }
}

function main({iterations, companies, candidates, slots, candidate_slots}) {

  var maxScore = 0;
  var bestSchedule = null;

  _.each(companies, function(company) {
    company.maxScore = calculateMaxScore(company, candidates);
    company.percentageOfMax = 0;
    company.companyScore = 0;
    company.adjScore = 0;
    company = determineDecemberGrad(company, false);
  });
  _.each(candidates, function(candidate) {
    candidate.repeats = '';
    candidate.schedule = new Array(slots);
    candidate = determineDecemberGrad(candidate);
  })
  // console.log('candidate[0] -- ', candidates[0]);
  // console.log('company[0] - ', companies[0]);

  for (var i=0; i < iterations; i++) {
    // debugger;
    _.each(candidates, function(candidate) {
      candidate.count = 0;
      candidate.repeats = '';
      candidate.name = trimName(candidate.name);
      for (var index=0; index<candidate.schedule.length; index++) {
        candidate.schedule[index] = null;
      }
    });
    // debugger;
    _.each(companies, function(company) {
      company.percentageOfMax = 0;
      company.companyScore = 0;
      company.adjScore = 0;
      // company.name = trimName(company.name);
    });
    // debugger;
    var schedule = new Schedule(candidates, companies, slots, candidate_slots);

    var scoreObject = schedule.score();

    debugger;
    // need these for the company interview schedules (schedule.row) and candidate interview schedules (candidate.schedule)
    // (only names are stored in these spots, not objects)
    var decGradCandidateNames = getDecemberGradNames(candidates);
    var decGradCompanyNames = getDecemberGradNames(companies);

    // need to add tags for output
    // companies = addDecemberGradTag(companies, false);
    candidates = addDecemberGradTag(candidates);
    debugger;

    // console.log('candidate schedule -- ', schedule.candidates[0].schedule);
    var data = _.map(schedule.schedule, function(row, i) {
      return {
        company: companies[i].name,
        interviews: addTag(row, decGradCandidateNames, '?decGrad'),
        maxScore: companies[i].maxScore,
        score: companies[i].companyScore,
        percentageOfMax: companies[i].percentageOfMax,
        adjScore: companies[i].adjScore
      };
    });

    // debugger;
    // var score = schedule.score();
//     debugger;
    self.postMessage(i+1);
//     console.log('schedule score -- ', score);
//     console.log('schedule -- ', schedule.schedule);
    if (scoreObject.score > maxScore) {
      i=0;
      maxScore = scoreObject.score;

      var enc = new TextEncoder("utf-8");
      var dataObj = {
        score: scoreObject.score,
        adjScore: scoreObject.adjScore,
        avgPercent: scoreObject.avgPercent,
        data: data,
        candidates: candidates,
        companies: companies,
        schedule: schedule.schedule
      };
      debugger;
      var arrBuf = enc.encode(JSON.stringify(dataObj)).buffer;
      self.postMessage({aTopic: 'newMax', aBuf: arrBuf}, [arrBuf]);

      bestSchedule = schedule;
    }
    // break;
  }

  close();
}

function populateCandidates({iterations, companies, candidates, slots, candidate_slots, schedule, newCompanies, newCandidates}) {
  // console.log('schedule -- ', schedule);
  // console.log('companies -- ', companies);
  // console.log('candidates -- ', candidates);
  // console.log('newCandidates -- ', newCandidates);
  // console.log('newCompanies -- ', newCompanies);
  candidates = newCandidates;
  companies = newCompanies;
  candidates = countCandidateInterviews(schedule, candidates, companies, slots);

  _.each(candidates, (candidate) => {
    candidate.name = trimName(candidate.name);
  });

  // const scheduleObj = {
  //   schedule: schedule,
  //   decGradCandidateNames: decGradCandidateNames,
  //   decGradCompanyNames: decGradCompanyNames
  // }
  // _.each(companies, (company) => {
  //   company.name = trimName(company.name);
  // })
  var bestSchedule = new Schedule(candidates, companies, slots, candidate_slots, schedule);
  bestSchedule.populateCandidates();

  var decGradCandidateNames = getDecemberGradNames(candidates);
  // var decGradCompanyNames = getDecemberGradNames(companies);

  _.each(companies, function(company) {
    company.maxScore = calculateMaxScore(company, candidates);
  });

  var scoreObject = bestSchedule.score();

  candidates = addDecemberGradTag(candidates);

  var data = _.map(bestSchedule.schedule, function(row, i) {
    return {
      company: companies[i].name,
      interviews: addTag(row, decGradCandidateNames, '?decGrad'),
      maxScore: companies[i].maxScore,
      score: companies[i].companyScore,
      percentageOfMax: companies[i].percentageOfMax,
      adjScore: companies[i].adjScore
    };
  });

  var enc = new TextEncoder("utf-8");
  var arrBuf = enc.encode(JSON.stringify({
    score: scoreObject.score,
    adjScore: scoreObject.adjScore,
    avgPercent: scoreObject.avgPercent,
        // data: data,
        // candidates: schedule.candidates,
    companies: bestSchedule.companies,
    schedule: bestSchedule.schedule,
    candidates: countCandidateInterviews(bestSchedule.schedule, candidates, companies, slots),
    data: data})).buffer;
  self.postMessage({aTopic: 'populated', aBuf: arrBuf}, [arrBuf]);

  close();
}

function calculateMaxScore(company, candidates) {
  var maxScore = 0;
  var counter = 0;

  for (var i=0; i < company.preferences.length; i++) {
    if (_.findWhere(candidates, {name: company.preferences[i]})) {
      // Fixme: might not always want this to be out of 20
      maxScore += (20 - i);
      counter++;
    }
    if (counter == 8) break;
  }
  return maxScore;
}

function calculateScore(company, candidates) {
  var score = 0;
  for (var i=0; i < candidates.length; i++) {
    var index = _.indexOf(company.preferences, candidates[i]);
    if (index >= 0) {
      // Fixme: might not always want this to be out of 20
      score += (20 - index);
    }
  }
  return score;
}

function countCandidateInterviews(schedule, candidates, companies, slots) {
  _.each(candidates, function(candidate) { candidate.count = 0; });

  for (var i=0; i < companies.length; i++) {
    for (var j=0; j < slots; j++) {
      var candidate = _.findWhere(candidates, { name: schedule[i][j] });
      if (candidate) candidate.count++;
    }
  }
  return candidates;
}

function determineDecemberGrad(object, trim = true) {
  if (isDecemberGrad(object.name)) {
    object.decGrad = true;
  } else {
    object.decGrad = false;
  }
  if (trim) object.name = trimName(object.name);
  
  return object;
}

function isDecemberGrad(name) {
  return indexOf(name, '?') !== -1;
}

function trimName(name) {
  var pos = indexOf(name, '?');
  if (pos !== -1) {
    return name.slice(0, pos);
  }
  return name;
}

function indexOf(str, findChar) {
  for (var i=0; i < str.length; i++) {
    if (str[i] === findChar) {
      return i;
    }
  }
  return -1;
}

function addDecemberGradTag(objectList/*, candidates = false, decGradCompanyList = undefined*/) {
  // debugger;
  for (var i=0; i < objectList.length; i++) {
    // debugger;
    if (objectList[i].decGrad) {
      var origString = objectList[i].name;
      objectList[i].name = origString.concat('?decGrad');
    }
    // if (candidates && decGradCompanyList) {
    //   objectList[i].schedule = addTag(objectList[i].schedule, decGradCompanyList, '?decGrad');
    // }
  }
  return objectList;
}

function addTag(listToBeTagged, shouldBeTaggedList, strToAdd) {
  let taggedList = [];
  for (var i = 0; i < listToBeTagged.length; i++) {
    if (_.contains(shouldBeTaggedList, listToBeTagged[i])) {
      taggedList.push(listToBeTagged[i].concat(strToAdd));
    } else {
      taggedList.push(listToBeTagged[i]);
    }
  }
  return taggedList;
}

function getDecemberGradNames(listOfObjects) {
  let finalList = [];
  for (var i = 0; i < listOfObjects.length; i++) {
    if (listOfObjects[i].decGrad) {
      finalList.push(listOfObjects[i].name);
    }
  }
  return finalList;
}