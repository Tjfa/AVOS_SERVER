var Competition = AV.Object.extend("Competition");
var Match = AV.Object.extend("Match");
var Player = AV.Object.extend("Player");
var Team = AV.Object.extend("Team");

var allowCrossDomain = function(req, res, next) {
    request.header('Access-Control-Allow-Origin', 'http://localhost:8000/');
    request.header('Access-Control-Allow-Credentials', true);
    request.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    request.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
};

AV.Cloud.define("hello", function(request, response) {
    response.success("success");
});

AV.Cloud.define("updateMatchAndPlayerData", function(request, response) {

    var teamA;
    var teamB;
    var match = request.params.match;
    var queryA = new AV.Query("Team");


    console.log("fucntion : updateMatchAndPlayerData");
    console.log("teamA:" + match.teamAName);
    console.log("teamB:" + match.teamBName);

    queryA.equalTo("name", match.teamAName);
    queryA.equalTo("competitionId", parseInt(match.competitionId));
    queryA.limit = 1;
    queryA.find({
        success: function(results) {
            if (results.length == 0) {
                console.log("leave function : updateMatchAndPlayerData");
                errorResponse(response, match.teamAName + "没有找到");
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
                        errorResponse(response, match.teamBName + "没有找到");
                        return;
                    }
                    teamB = results[0];

                    match = generalJsonMatch(match, teamA, teamB);

                    // 更新match
                    var avMatch = new Match();
                    addMatchWithJsonMatch(avMatch, match);
                    updateTeamWithMatch(match, teamA, teamB);

                    var teamAPlayerQuery = new AV.Query("Player");
                    teamAPlayerQuery.equalTo("competitionId", match.competitionId);
                    teamAPlayerQuery.equalTo("name", match.teamAName);

                    var teamBPlayerQuery = new AV.Query("Player");
                    teamBPlayerQuery.equalTo("competitionId", match.competitionId);
                    teamBPlayerQuery.equalTo("name", match.teamBName);

                    var playersQuery = new AV.Query.or(teamAPlayerQuery, teamBPlayerQuery);

                    playersQuery.find({
                        success: function(results) {
                            var players = request.params.players;
                            for (var index in players) {
                                var player = players[index];

                                player = generalJsonPlayer(player, match.competitionId);

                                if (player.team == teamA.get('name')) {
                                    player.teamId = teamA.get('teamId');
                                } 
                                else {
                                    player.teamId = teamB.get('teamId'); 
                                } 

                                var avPlayer = null;
                                for (var i = 0; i < results.length; i++) {
                                    var resultPlayer = results[i];
                                    var resultTeamId = resultPlayer.get("teamId");
                                    if (resultPlayer.get("name") == player.name && player.teamId == resultTeamId) {
                                        avPlayer = resultPlayer;
                                        break;
                                    }
                                }
                                if (avPlayer == null) {
                                    console.log("no found player", player.name);
                                    avPlayer = new Player();
                                    initPlayer(avPlayer);
                                }
                                updatePlayerWithJsonPlayer(avPlayer, player);
                            }


                            console.log("success");
                            console.log("leave function : updateMatchAndPlayerData");
                            var responseObject = {
                                success: "success"
                            };
                            response.success(responseObject);
                        },
                        error: function() {
                            console.log("leave function : updateMatchAndPlayerData");
                            errorResponse(response, "未知错误,请及时联系我(mailqiufeng@gmail.com 或者 18817367675) 速度联系");
                        }
                    });
                },
                error: function() {
                    console.log("leave function : updateMatchAndPlayerData");
                    errorResponse(response, match.teamBName + "没有找到");
                },
            })

        },
        error: function() {
            errorResponse(match.teamAName + "没有找到");
        },
    });
});

function errorResponse(response, msg) {
    console.log(msg);
    response.success(msg);
}

//客户端传入过来会都是string  所以需要数字化一下
function generalJsonMatch(match, teamA, teamB) {
    console.log("enter generalAVMatch");
    var match = {
            scoreA: parseInt(match.scoreA),
            scoreB: parseInt(match.scoreB),
            penaltyA: parseInt(match.penaltyA),
            penaltyB: parseInt(match.penaltyB),
            teamAName: match.teamAName,
            teamBName: match.teamBName,
            competitionId: parseInt(match.competitionId),
            isStart: 2,
            hint: match.hint,
            matchProperty: parseInt(match.matchProperty),
            date: string2Date(match.date),
            teamAId: teamA.get("teamId"),
            teamBId: teamB.get("teamId"),
            teamAName: teamA.name,
            teamBName: teamB.name,
            referee: match.referee,
        }
    return match;
}

function generalJsonPlayer(player, competitionId) {
    console.log("general AV Player");
    var newPlayer = {
            name: player.name,
            yellowCard: parseInt(player.yellowCard),
            redCard: parseInt(player.redCard),
            goalCount: parseInt(player.goalCount),
            competitionId: competitionId,
            team: player.team,
    }
    return newPlayer;
}

function addMatchWithJsonMatch(avMatch, match) {
    console.log("add match");
    avMatch.set("scoreA", match.scoreA);
    avMatch.set("scoreB", match.scoreB);
    avMatch.set('penaltyA', match.penaltyA);
    avMatch.set('penaltyB', match.penaltyB);
    avMatch.set('teamAId', match.teamAId);
    avMatch.set('teamBId', match.teamBId);
    avMatch.set('isStart', match.isStart);
    avMatch.set('matchProperty', match.matchProperty);
    avMatch.set('competitionId', match.competitionId);
    avMatch.set('hint', match.hint);
    avMatch.set('date', match.date);
    avMatch.set('referee', match.referee);
    avMatch.save();
}

function updateTeamWithMatch(match, teamA, teamB) {
    // 更新team
    var scoreA = match.scoreA;
    var scoreB = match.scoreB;
    var penaltyA = match.penaltyA;
    var penaltyB = match.penaltyB;

    if (match.matchProperty == 0) {
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

        }
        else if (scoreA == scoreB) {
            teamA.increment('groupDrawCount');
            teamB.increment('groupDrawCount');
            teamA.increment('score');
            teamB.increment('score');

        } 
        else {
            teamA.increment('groupLostCount');
            teamA.increment('lostCount');
            teamB.increment('groupWinCount');
            teamB.increment('winCount');
            teamB.set('score', teamB.get('score') + 3);
        }
        teamA.set('rank', 0);
        teamB.set('rank', 0);
    } 
    else { //不是小组赛 需要更新rank
        if (scoreA > scoreB || penaltyA > penaltyB) {
            teamA.increment('winCount');
            teamB.increment('lostCount');
            teamA.set('rank', getWinRankWithMatchProperty(match.matchProperty));
            teamB.set('rank', getLostRankWithMatchProperty(match.matchProperty));

        } else {
            teamA.increment('lostCount');
            teamB.increment('winCount');
            teamA.set('rank', getLostRankWithMatchProperty(match.matchProperty));
            teamB.set('rank', getWinRankWithMatchProperty(match.matchProperty))
        }

    }

    teamA.set('goalCount', teamA.get('goalCount') + scoreA);
    teamB.set('goalCount', teamB.get('goalCount') + scoreB);
    teamA.set('missCount', teamA.get('missCount') + scoreB);
    teamB.set('missCount', teamB.get('missCount') + scoreA);

    console.log("save A:" + teamA.get("name"));
    console.log("save B:" + teamB.get("name"));
    teamA.save();
    teamB.save();
}

function updatePlayerWithJsonPlayer(avPlayer, player) {
    console.log("update player" + player.name);
    avPlayer.set('name', player.name);
    avPlayer.set('goalCount', avPlayer.get('goalCount') + player.goalCount);
    avPlayer.set('yellowCard', avPlayer.get('yellowCard') + player.yellowCard);
    avPlayer.set('redCard', avPlayer.get('redCard') + player.redCard);
    avPlayer.set('teamId', player.teamId);
    avPlayer.set('competitionId', player.competitionId);
    avPlayer.save();
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
