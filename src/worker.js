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
      populateCandidates(data);
      break;
    default:
      throw 'no aTopic on incoming message to ChromeWorker';
  }
}

function main({iterations, companies, candidates, slots, candidate_slots, maxConsecutive}) {
  companies = processCompanyExceptions(companies);

  var maxScore = 0;
  var bestSchedule = null;

  _.each(companies, function(company) {
    company.maxScore = calculateMaxScore(company, candidates);
    company.percentageOfMax = 0;
    company.companyScore = 0;
    company.adjScore = 0;
    company.topPreferences = [];
    company = determineDecemberGrad(company, false);
  });
  _.each(candidates, function(candidate) {
    candidate.repeats = '';
    candidate.schedule = new Array(slots);
    candidate = determineDecemberGrad(candidate);
  })

  for (var i=0; i < iterations; i++) {
    _.each(candidates, function(candidate) {
      candidate.count = 0;
      candidate.repeats = '';
      candidate.name = trimName(candidate.name);
      for (var index=0; index<candidate.schedule.length; index++) {
        candidate.schedule[index] = null;
      }
    });
    _.each(companies, function(company) {
      company.percentageOfMax = 0;
      company.companyScore = 0;
      company.adjScore = 0;
      company.topPreferences = [];
    });
    var schedule = new Schedule(candidates, companies, slots, candidate_slots, maxConsecutive);

    var scoreObject = schedule.score();

    // need these for the company interview schedules (schedule.row) and candidate interview schedules (candidate.schedule)
    // (only names are stored in these spots, not objects)
    var decGradCandidateNames = getDecemberGradNames(candidates);

    // need to add tags for output
    candidates = addDecemberGradTag(candidates);

    var data = _.map(schedule.schedule, function(row, i) {
      return {
        company: companies[i].name,
        preferences: companies[i].topPreferences, 
        interviews: addTag(row, decGradCandidateNames, '?decGrad'),
        maxScore: companies[i].maxScore,
        score: companies[i].companyScore,
        percentageOfMax: companies[i].percentageOfMax,
        adjScore: companies[i].adjScore
      };
    });

    self.postMessage(i+1);

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
        schedule: schedule.schedule,
        maxConsecutive: maxConsecutive
      };
      var arrBuf = enc.encode(JSON.stringify(dataObj)).buffer;
      self.postMessage({aTopic: 'newMax', aBuf: arrBuf}, [arrBuf]);

      bestSchedule = schedule;
    }
  }

  close();
}

function populateCandidates({iterations, companies, candidates, slots, candidate_slots, schedule, newCompanies, newCandidates, maxConsecutive}) {
  candidates = newCandidates;
  companies = newCompanies;
  _.each(candidates, (candidate) => {
    candidate.name = trimName(candidate.name);
  });

  var bestSchedule = new Schedule(candidates, companies, slots, candidate_slots, maxConsecutive, schedule);
  bestSchedule.populateCandidates();

  var decGradCandidateNames = getDecemberGradNames(candidates);

  _.each(companies, function(company) {
    company.maxScore = calculateMaxScore(company, candidates);
  });

  var scoreObject = bestSchedule.score();

  bestSchedule.candidates = addDecemberGradTag(bestSchedule.candidates);

  var data = _.map(bestSchedule.schedule, function(row, i) {
    return {
      company: companies[i].name,
      preferences: companies[i].topPreferences,
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
    candidates: bestSchedule.candidates,
    companies: bestSchedule.companies,
    schedule: bestSchedule.schedule,
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

function addDecemberGradTag(objectList) {
  for (var i=0; i < objectList.length; i++) {
    if (objectList[i].decGrad) {
      var origString = objectList[i].name;
      objectList[i].name = origString.concat('?decGrad');
    }
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

function processCompanyExceptions(companyList) {
  var finalCompanyList = [];
  for (var i = 0; i < companyList.length; i=i+2) {
    var newCompany = {};
    newCompany.name = companyList[i].name;
    newCompany.preferences = companyList[i].preferences;

    var exceptionList = [];
    var companyExceptionList = companyList[i+1].preferences;
    for (var index=0; index < companyExceptionList.length; index++) {
      if (companyExceptionList[index] !== '') {
        exceptionList.push(companyExceptionList[index]);
      }
    }
    newCompany.exceptions = exceptionList;
    finalCompanyList.push(newCompany);
  }
  return finalCompanyList;
}