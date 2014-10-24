var Competition = AV.Object.extend("Competition");
var Match = AV.Object.extend("Match");
var Player = AV.Object.extend("Player");
var Team = AV.Object.extend("Team");

AV.Cloud.define("hello", function(request, response) {
    console.log("hello");
    response.success("success");
});

AV.Cloud.define("updateMatchAndPlayerData", function(request, response) {
    console.log("fucntion : updateMatchAndPlayerData");
    var teamA;
    var teamB;
    var match = request.params.match;
    var queryA = new AV.Query("Team");
    queryA.equalTo("name", match.teamAName);
    queryA.equalTo("competitionId", parseInt(match.competitionId));
    queryA.limit = 1;
    queryA.find({
        success: function(results) {
            if (results.length == 0) {
                response.error(match.teamAName + "没有找到");
                return;
            }
            teamA = results[0];

            var queryB = new AV.Query("Team");
            queryB.equalTo("name", match.teamBName);
            queryB.equalTo("competitionId", parseInt(match.competitionId));
            queryB.limit = 1;

            queryB.find({

                success: function(results) {
                    if (results.length == 0) {
                        response.error(match.teamBName + "没有找到");
                        return;
                    }
                    teamB = results[0];

                    // 更新match
                    var avMatch = new Match();
                    var scoreA = parseInt(match.scoreA);
                    var scoreB = parseInt(match.scoreB);
                    var penaltyA = parseInt(match.penaltyA);
                    var penaltyB = parseInt(match.penaltyB);
                    var competitionId = parseInt(match.competitionId);

                    avMatch.set("scoreA", scoreA);
                    avMatch.set("scoreB", scoreB);
                    avMatch.set("penaltyA", penaltyA);
                    avMatch.set('penaltyA', penaltyA);
                    avMatch.set('penaltyB', penaltyB);
                    avMatch.set('teamAId', teamA.get('teamId'));
                    avMatch.set('teamBId', teamB.get('teamId'));
                    avMatch.set('isStart', 2);
                    avMatch.set('matchProperty', parseInt(match.matchProperty));
                    avMatch.set('competitionId', competitionId);
                    avMatch.set('hint', match.hint);
                    avMatch.set('date', string2Date(match.date));
                    avMatch.save();

                    // 更新team
                    if (parseInt(match.matchProperty) == 0) {
                        teamA.set('groupGoalCount', teamA.get('groupGoalCount') + scoreA);
                        teamB.set('groupGoalCount', teamB.get('groupGoalCount') + scoreB);
                        teamA.set('groupMissCount', teamA.get('groupMissCount') + scoreB);
                        teamB.set('groupMissCount', teamB.get('groupMissCount') + scoreA);
                        if (scoreA > scoreB) {
                            teamA.increment('groupWinCount');
                            teamB.increment('groupLostCount');
                            teamA.increment('winCount');
                            teamB.increment('lostCount');
                            teamA.set('score', teamA.get('score') + 3);

                        } else if (scoreA == scoreB) {
                            teamA.increment('groupDrawCount');
                            teamB.increment('groupDrawCount');
                            teamA.increment('score');
                            teamB.increment('score');

                        } else {
                            teamA.increment('groupLostCount');
                            teamA.increment('lostCount');
                            teamB.increment('groupWinCount');
                            teamB.increment('winCount');
                            teamB.set('score', teamB.get('score') + 3);
                        }
                        teamA.set('rank', 0);
                        teamB.set('rank', 0);


                    } else { //不是小组赛 需要更新rank
                        if (scoreA > scoreB || penaltyA > penaltyB) {
                            teamA.increment('winCount');
                            teamB.increment('lostCount');
                            teamA.set('rank', getWinRankWithMatchProperty(avMatch.matchProperty));
                            teamB.set('rank', getLostRankWithMatchProperty(avMatch.matchProperty));

                        } else {
                            teamA.increment('lostCount');
                            teamB.increment('winCount');
                            teamA.set('rank', getLostRankWithMatchProperty(avMatch.matchProperty));
                            teamB.set('rank', getWinRankWithMatchProperty(avMatch.matchProperty))
                        }
                    }

                    teamA.set('goalCount', teamA.get('goalCount') + scoreA);
                    teamB.set('goalCount', teamB.get('goalCount') + scoreB);
                    teamA.set('missCount', teamA.get('missCount') + scoreB);
                    teamB.set('missCount', teamB.get('missCount') + scoreA);
                    teamA.save();
                    teamB.save();

                    var players = request.params.players;

                    for (var index in players) {
                        var player = players[index];
                        var teamId;
                        if (player.team == teamA.get('name')) {
                            teamId = teamA.get('teamId');
                        } else teamId = teamB.get('teamId');

                        updatePlayer(player, teamId, competitionId);
                    }

                    var responseObject = {
                        success: "success"
                    };
                    response.success(responseObject);
                },
                error: function() {
                    response.error(match.teamBName + "没有找到");
                },
            })

        },
        error: function() {

            response.error(match.teamAName + "没有找到");
        },
    });
});

function updatePlayer(player, teamId, competitionId, callback) {
    var queryPlayer = new AV.Query("Player");
    queryPlayer.equalTo("name", player.name);
    queryPlayer.equalTo("teamId", teamId);
    queryPlayer.equalTo("competitionId", competitionId);


    queryPlayer.limit = 1;
    queryPlayer.find({
        success: function(results) {
            var avPlayer;
            if (results.length == 0) {
                avPlayer = new Player();
                initPlayer(avPlayer);
            } else avPlayer = results[0];
            avPlayer.set('name', player.name);
            avPlayer.set('goalCount', avPlayer.get('goalCount') + parseInt(player.goalCount));
            avPlayer.set('yellowCard', avPlayer.get('yellowCard') + parseInt(player.yellowCard));
            avPlayer.set('redCard', avPlayer.get('redCard') + parseInt(player.redCard));
            avPlayer.set('teamId', teamId);
            avPlayer.set('competitionId', competitionId);
            avPlayer.save();
            if (callback) {
                callback();
            }

        }
    });

}

function initPlayer(avPlayer) {
    avPlayer.set('goalCount', 0);
    avPlayer.set('yellowCard', 0);
    avPlayer.set('redCard', 0);
}

///    var s = "2005-12-15  09:41:30";

function string2Date(formatString) {
    return new Date(Date.parse(formatString.replace(/-/g, "/")));
}


/**
 *  比赛性质 0:小组赛  1:决赛 2:半决赛 4:1/4 8:1/8 16:1/16 32:1/32 100：附加赛
 */
function getWinRankWithMatchProperty(matchProperty) {
    if (matchProperty == 100)
        return 0;
    return matchProperty;
}

function getLostRankWithMatchProperty(matchProperty) {
    switch (matchProperty) {
        case 0:
            return 0;
        case 1:
            return 2;
        case 2:
            return 4;
        case 3:
            return 4;
        case 4:
            return 8;
        case 8:
            return 16;
        case 16:
            return 32;
        case 32:
            return 64;
        default:
            return 0;
    }
}