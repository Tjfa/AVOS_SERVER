var Competition = AV.Object.extend("Competition");
var Match = AV.Object.extend("Match");
var Player = AV.Object.extend("Player");
var Team = AV.Object.extend("Team");

AV.Cloud.define("updateMatchAndPlayerData", function(request, response) {
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
                response.error(request.params.teamAName + "没有找到");
            }
            teamA = results[0];

            var queryB = new AV.Query("Team");
            queryB.equalTo("name", match.teamBName);
            queryB.equalTo("competitionId", parseInt(match.competitionId));
            queryB.limit = 1;

            queryB.find({
                success: function(results) {
                    if (results.length == 0) {
                        response.error(request.params.teamBName + "没有找到");
                    }
                    teamB = results[0];

                    // 更新match
                    var avMatch = new Match();
                    var scoreA = parseInt(match.scoreA);
                    var scoreB = parseInt(match.scoreB);
                    var penaltyA = parseInt(match.penaltyA);
                    var penaltyB = parseInt(match.penaltyB);
                    avMatch.scoreA = scoreA;
                    avMatch.scoreB = scoreB;
                    avMatch.penaltyA = penaltyA;
                    avMatch.penaltyB = penaltyB;
                    avMatch.teamAId = teamA.teamId;
                    avMatch.teamBId = teamB.teamId;
                    avMatch.isStart = 2;
                    avMatch.matchProperty = parseInt(match.matchProperty);
                    avMatch.competitionId = match.competitionId;
                    avMatch.hint = hint;
                    avMatch.date = string2Date(match.date);
                    avMatch.save();
                    // 更新team
                    if (avMatch.matchProperty == 0) {
                        teamA.groupGoalCount += parseInt(match.teamA.groupGoalCount);
                        teamB.groupGoalCount += parseInt(match.teamB.groupGoalCount);
                        teamA.groupMissCount += parseInt(match.teamB.groupGoalCount);
                        teamB.groupMissCount += parseInt(match.teamA.groupGoalCount);
                        if (scoreA > scoreB) {
                            teamA.groupWinCount += 1;
                            teamB.groupLostCount += 1;
                            teamA.winCount += 1;
                            teamB.lostCount += 1;
                            teamA.score += 3;
                        } else if (scoreA == scoreB) {
                            teamA.groupDrawCount += 1;
                            teamB.groupDrawCount += 1;
                            teamA.score += 1;
                            teamB.score += 1;
                        } else {
                            teamA.groupLostCount += 1;
                            teamB.groupWinCount += 1;
                            teamB.winCount += 1;
                            teamA.lostCount += 1;
                            teamB.score += 3;
                        }
                        teamA.rank = 0;
                        teamB.rank = 0;

                    } else { //不是小组赛 需要更新rank
                        if (scoreA > scoreB || penaltyA > penaltyB) {
                            teamA.winCount += 1;
                            teamB.lostCount += 1;
                            teamA.rank = getWinRankWithMatchProperty(avMatch.matchProperty);
                            teamB.rank = getLostRankWithMatchProperty(avMatch.matchProperty);
                        } else {
                            teamA.lostCount += 1;
                            teamB.winCount += 1;
                            teamA.rank = getLostRankWithMatchProperty(avMatch);
                            teamB.rank = getWinRankWithMatchProperty(avMatch);
                        }
                    }

                    teamA.goalCount += parseInt(match.teamA.groupGoalCount);
                    teamB.goalCount += parseInt(match.teamB.groupGoalCount);
                    teamA.missCount += parseInt(match.teamB.groupGoalCount);
                    teamB.missCount += parseInt(match.teamA.groupGoalCount);

                    teamA.save();
                    teamB.save();


                    // for (var player in request.parames.players) {
                    //     var queryPlayer = new AV.Query("Team");
                    //     queryPlayer.equalTo("name", player.name);

                    //     var teamId;
                    //     if (player.team == teamA.name) {
                    //         teamId = teamA.teamId;
                    //     } else teamId = teamB.teamId;

                    //     queryPlayer.equalTo("teamId", teamId);
                    //     queryPlayer.equalTo("competitionId", match.competitionId);
                    //     queryPlayer.limit = 1;
                    //     queryPlayer.find({
                    //         success: function(results) {
                    //             var avPlayer;
                    //             if (results.length == 0) {
                    //                 avPlayer = new Player();
                    //                 initPlayer(avPlayer);
                    //             } else avPlayer = results[0];

                    //             avPlayer.goalCount += player.goalCount;
                    //             avPlayer.yellowCard += player.yellowCard;
                    //             avPlayer.redCard = player.redCard;
                    //             avPlayer.save();
                    //         }
                    //     });
                    // }

                    var responseObject = {
                        success: "success"
                    };
                    response.success(responseObject);
                },
                error: function() {
                    response.error(request.parames.teamBName + "没有找到");
                },
            })

        },
        error: function() {

            response.error(request.parames.teamAName + "没有找到");
        },
    });
});

///    var s = "2005-12-15  09:41:30";

function string2Date(formatString) {
    return new Date(Date.parse(s.replace(/-/g, "/")));
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

function initPlayer(player) {
    player.goalCount = 0;
    player.yellowCard = 0;
    player.redCard = 0;
}