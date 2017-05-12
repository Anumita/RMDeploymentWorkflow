define(["require", "exports", "ReleaseManagement/Core/Contracts", "jquery"], function (require, exports, RM_Contracts, $) {
    "use strict";
    var width, height;
    var releasedEnvironment = (function () {
        function releasedEnvironment(name, id, dependencies, preapproval_list, postapproval_list, level) {
            this.level = 0;
            this.name = name;
            this.id = id;
            this.dependencies = dependencies;
            this.preapproval_list = preapproval_list;
            this.postapproval_list = postapproval_list;
            this.level = level;
        }
        return releasedEnvironment;
    }());
    var Dependency = (function () {
        function Dependency(environmentName, level) {
            this.environmentName = environmentName;
            this.level = level;
        }
        return Dependency;
    }());
    var ReleasedEnvironments = new Array();
    var totalNoOfReleasedEnvironments = 0;
    var release_name, levelOfEnvironment, maxLevelNumber = 0; // level : position of current environment in the graph
    var ReleaseStartedNodeId = "start";
    var canvas, context;
    function createUI() {
        width = $(document).width();
        height = $(document).height();
        $(".deployment-workflow-section").width(width);
        $(".deployment-workflow-section").height(height);
        var environmentsDiv = $('<div/>', {
            class: 'environments '
        });
        var detailsDiv = $('<div/>', {
            class: 'details '
        });
        $(".deployment-workflow-section").append(environmentsDiv);
        $(".deployment-workflow-section").append(detailsDiv);
        $(".deployment-workflow-section").append('<canvas id="connectionCanvas"  width="' + width + '" height="' + height + '"  > </canvas>');
    }
    //Create the starting initial Node
    function CreateReleaseStartedNode() {
        $('.environments').empty();
        var startNode = $('<div/>', {
            id: ReleaseStartedNodeId
        });
        $('.environments').append(startNode);
        var startoffset = $("#start").offset();
        startoffset.top = startoffset.top + 23;
        $("#start").offset(startoffset);
    }
    function EnvironmentLevelCalculated(name, LevelDecided) {
        for (var Environments = 0; Environments < LevelDecided.length; Environments++) {
            if (LevelDecided[Environments] == name)
                return 1;
        }
        return 0;
    }
    //Calculate the level of each Environment
    function CalculateLevel(dependentEnvironmentName) {
        var dependentEnvironmentLevel = 0;
        for (var environment = 0; environment < ReleasedEnvironments.length; environment++) {
            if (dependentEnvironmentName == ReleasedEnvironments[environment].name) {
                dependentEnvironmentLevel = ReleasedEnvironments[environment].level;
                if (levelOfEnvironment < ReleasedEnvironments[environment].level)
                    levelOfEnvironment = ReleasedEnvironments[environment].level;
                break;
            }
        }
        return new Dependency(dependentEnvironmentName, dependentEnvironmentLevel);
    }
    //Calculating New Level
    function CalculateEnvironmentLevel() {
        var CountOfEnvironments = 0;
        var LevelDecided = new Array();
        var IndexLevelDecided = 0;
        while (CountOfEnvironments < totalNoOfReleasedEnvironments) {
            for (var EnvironmentIndex = 0; EnvironmentIndex < ReleasedEnvironments.length; EnvironmentIndex++) {
                levelOfEnvironment = 0;
                if (ReleasedEnvironments[EnvironmentIndex].dependencies.length == 0 && EnvironmentLevelCalculated(ReleasedEnvironments[EnvironmentIndex].name, LevelDecided) == 0) {
                    ReleasedEnvironments[EnvironmentIndex].level = 1;
                    CountOfEnvironments++;
                    LevelDecided[IndexLevelDecided++] = ReleasedEnvironments[EnvironmentIndex].name;
                    if (maxLevelNumber < ReleasedEnvironments[EnvironmentIndex].level)
                        maxLevelNumber = ReleasedEnvironments[EnvironmentIndex].level;
                }
                else {
                    var dependencyCount = 0;
                    var countOfParents = 0;
                    var found = 0;
                    levelOfEnvironment = 0;
                    while (dependencyCount < ReleasedEnvironments[EnvironmentIndex].dependencies.length) {
                        found = 0;
                        if (ReleasedEnvironments[EnvironmentIndex].dependencies[0].environmentName == "ReleaseStarted" && EnvironmentLevelCalculated(ReleasedEnvironments[EnvironmentIndex].name, LevelDecided) == 0) {
                            ReleasedEnvironments[EnvironmentIndex].level = 1;
                            CountOfEnvironments++;
                            LevelDecided[IndexLevelDecided++] = ReleasedEnvironments[EnvironmentIndex].name;
                            if (maxLevelNumber < ReleasedEnvironments[EnvironmentIndex].level)
                                maxLevelNumber = ReleasedEnvironments[EnvironmentIndex].level;
                            break;
                        }
                        else {
                            found = EnvironmentLevelCalculated(ReleasedEnvironments[EnvironmentIndex].dependencies[dependencyCount].environmentName, LevelDecided);
                            if (found == 1)
                                countOfParents++;
                        }
                        dependencyCount++;
                    }
                    if (countOfParents == ReleasedEnvironments[EnvironmentIndex].dependencies.length && EnvironmentLevelCalculated(ReleasedEnvironments[EnvironmentIndex].name, LevelDecided) == 0) {
                        var maxlevel = 0;
                        for (var parentEnvironment = 0; parentEnvironment < ReleasedEnvironments[EnvironmentIndex].dependencies.length; parentEnvironment++) {
                            for (var environment = 0; environment < ReleasedEnvironments.length; environment++) {
                                if (ReleasedEnvironments[environment].name == ReleasedEnvironments[EnvironmentIndex].dependencies[parentEnvironment].environmentName) {
                                    if (maxlevel < ReleasedEnvironments[environment].level)
                                        maxlevel = ReleasedEnvironments[environment].level;
                                    break;
                                }
                            }
                        }
                        ReleasedEnvironments[EnvironmentIndex].level = maxlevel + 1;
                        LevelDecided[IndexLevelDecided++] = ReleasedEnvironments[EnvironmentIndex].name;
                        CountOfEnvironments++;
                        if (maxLevelNumber < ReleasedEnvironments[EnvironmentIndex].level)
                            maxLevelNumber = ReleasedEnvironments[EnvironmentIndex].level;
                    }
                }
            }
        }
    }
    //Draw the Graph based on the levels
    function DrawGraph() {
        var releasedEnvironmentCount = 0, levelOfEnvironment = 1;
        var offsetOnLevels = width / maxLevelNumber;
        var shiftTop = 7;
        var shiftLeft;
        shiftLeft = offsetOnLevels / 2; //shiftTop is the offset used to place the environments on the same level one below the other;
        var levelOneOffset, flag = 0;
        //shiftLeft is the offset used to shift to the next level; 
        while (releasedEnvironmentCount < totalNoOfReleasedEnvironments) {
            for (var environment = 0; environment < ReleasedEnvironments.length; environment++) {
                var shiftLeftOffset = 0;
                if (levelOfEnvironment == ReleasedEnvironments[environment].level) {
                    if (ReleasedEnvironments[environment].preapproval_list.length == 0)
                        shiftLeftOffset = 15;
                    else
                        shiftLeftOffset = 0;
                    if (flag == 0) {
                        levelOneOffset = $("#" + ReleasedEnvironments[environment].name).offset();
                        levelOneOffset.left += shiftLeft;
                        levelOneOffset.top += shiftTop;
                        $("#" + ReleasedEnvironments[environment].name).offset({ top: levelOneOffset.top, left: levelOneOffset.left + shiftLeftOffset });
                        flag = 1;
                    }
                    else {
                        $("#" + ReleasedEnvironments[environment].name).offset({ top: levelOneOffset.top + shiftTop, left: levelOneOffset.left + shiftLeftOffset });
                    }
                    releasedEnvironmentCount++;
                    shiftTop += 45;
                }
            }
            levelOneOffset.left += offsetOnLevels;
            shiftTop = 0;
            levelOfEnvironment++;
        }
    }
    function DrawStraightConnection(sourceX, sourceY, targetX, targetY) {
        canvas = document.getElementById("connectionCanvas");
        context = canvas.getContext("2d");
        context.beginPath();
        context.linewidth = 10;
        context.strokeStyle = "#D3D3D3";
        context.moveTo(sourceX, sourceY);
        context.lineTo(targetX, targetY);
        context.stroke();
    }
    function DrawCurvedConnection(sourceX, sourceY, targetX, targetY, controlPointX, controlPointY, radius) {
        canvas = document.getElementById("connectionCanvas");
        context = canvas.getContext("2d");
        context.beginPath();
        context.linewidth = 10;
        context.strokeStyle = "#D3D3D3";
        context.moveTo(sourceX, sourceY);
        context.arcTo(controlPointX, controlPointY, targetX, targetY, radius);
        context.lineTo(targetX, targetY);
        context.stroke();
    }
    //Draws the connections between the Environments using jsPlumb
    function ConnectNodes() {
        var releasedEnvironmentCount = 0;
        var controlPointX;
        var offsetDistance;
        var midpointLeft;
        while (releasedEnvironmentCount < totalNoOfReleasedEnvironments) {
            var dependencyCount = 0;
            if (ReleasedEnvironments[releasedEnvironmentCount].dependencies[dependencyCount].environmentName != "ReleaseStarted" && ReleasedEnvironments[releasedEnvironmentCount].dependencies.length != 0) {
                while (dependencyCount < ReleasedEnvironments[releasedEnvironmentCount].dependencies.length) {
                    var sourceOffset = $("#" + ReleasedEnvironments[releasedEnvironmentCount].dependencies[dependencyCount].environmentName).position();
                    var targetOffset = $("#" + ReleasedEnvironments[releasedEnvironmentCount].name).position();
                    var sourceWidth = $("#" + ReleasedEnvironments[releasedEnvironmentCount].dependencies[dependencyCount].environmentName).width();
                    var sourceHeight = $("#" + ReleasedEnvironments[releasedEnvironmentCount].dependencies[dependencyCount].environmentName).height() / 2;
                    var targetHeight = $("#" + ReleasedEnvironments[releasedEnvironmentCount].name).height() / 2;
                    midpointLeft = sourceOffset.left + sourceWidth + ((targetOffset.left - (sourceOffset.left + sourceWidth)) / 2);
                    controlPointX = midpointLeft + ((targetOffset.left - midpointLeft) / 2);
                    var radius = ((targetOffset.left - (sourceOffset.left + sourceWidth)) / 2) / 2;
                    if (sourceOffset.top == targetOffset.top) {
                        if ((ReleasedEnvironments[releasedEnvironmentCount].level - ReleasedEnvironments[releasedEnvironmentCount].dependencies[dependencyCount].level) > 1) {
                            DrawCurvedConnection(sourceOffset.left + sourceWidth, sourceOffset.top + sourceHeight, targetOffset.left, targetOffset.top + targetHeight, midpointLeft, targetOffset.top - targetHeight, radius);
                        }
                        else {
                            DrawStraightConnection(sourceOffset.left + sourceWidth, sourceOffset.top + sourceHeight, targetOffset.left, targetOffset.top + targetHeight);
                        }
                    }
                    else {
                        DrawCurvedConnection(sourceOffset.left + sourceWidth, sourceOffset.top + sourceHeight, targetOffset.left, targetOffset.top + targetHeight, controlPointX, targetOffset.top + targetHeight, radius);
                    }
                    dependencyCount++;
                }
            }
            else {
                //Connnect the ReleaseStarted node to the environments on the first level
                var sourceOffset = $("#start").position();
                var targetOffset = $("#" + ReleasedEnvironments[releasedEnvironmentCount].name).position();
                var sourceWidth = $("#start").width();
                var sourceHeight = $("#start").height() / 2;
                var targetHeight = $("#" + ReleasedEnvironments[releasedEnvironmentCount].name).height() / 2;
                midpointLeft = sourceOffset.left + sourceWidth + ((targetOffset.left - (sourceOffset.left + sourceWidth)) / 2);
                controlPointX = midpointLeft + ((targetOffset.left - midpointLeft) / 2);
                var radius = ((targetOffset.left - (sourceOffset.left + sourceWidth)) / 2) / 2;
                if (sourceOffset.top == targetOffset.top) {
                    DrawStraightConnection(sourceOffset.left + sourceWidth, sourceOffset.top + sourceHeight, targetOffset.left, targetOffset.top + targetHeight);
                }
                else {
                    DrawCurvedConnection(sourceOffset.left + sourceWidth, sourceOffset.top + sourceHeight, targetOffset.left, targetOffset.top + targetHeight, controlPointX, targetOffset.top + targetHeight, radius);
                }
            }
            releasedEnvironmentCount++;
        } //End of while
    }
    VSS.ready(function () {
        var c = VSS.getConfiguration();
        c.onReleaseChanged(function (release) {
            createUI();
            totalNoOfReleasedEnvironments = 0;
            release_name = release.definitionName;
            CreateReleaseStartedNode();
            ReleasedEnvironments.splice(0, ReleasedEnvironments.length);
            release.environments.forEach(function (env) {
                var state = 'State: '; //Initialization
                var status = 'pending';
                var dependencies = new Array(); //Contains dependencies of current environment
                var preApprovalStatus = 'notStarted';
                var postApprovalStatus = 'notStarted';
                var environmentName = (env.name).replace(/\s+/g, '');
                var dependencyIndex = 0;
                var dependencyCount = 0;
                levelOfEnvironment = 0; // Initializing level to 0 
                //Calculating Level of current Environment and storing Dependencies
                while (dependencyCount < env.conditions.length) {
                    var dependentEnvironmentName = (env.conditions[dependencyCount].name).replace(/\s+/g, '');
                    if (env.conditions[0].name == "ReleaseStarted") {
                        levelOfEnvironment = 1;
                        dependencies[dependencyIndex] = new Dependency(dependentEnvironmentName, 0);
                    }
                    else
                        dependencies[dependencyIndex] = CalculateLevel(dependentEnvironmentName);
                    dependencyIndex++;
                    dependencyCount++;
                }
                try {
                    if (env.conditions[0].name == "ReleaseStarted" || env.conditions.length == 0)
                        levelOfEnvironment = 1;
                    else
                        levelOfEnvironment = levelOfEnvironment + 1;
                }
                catch (e) {
                    levelOfEnvironment = 1; //Throw exception if manual deployment
                }
                var countOFApprovers = 0;
                var preapproval_list = new Array(); //List of preApprovers of current Environment
                var postapproval_list = new Array(); //List of postApprovers of current Environment
                var preApprovalsSnapshot = env.preApprovalsSnapshot.approvals;
                var postApprovalsSnapshot = env.postApprovalsSnapshot.approvals;
                //Storing List of PreApprovers
                while (preApprovalsSnapshot[0].isAutomated == false && countOFApprovers < preApprovalsSnapshot.length) {
                    preapproval_list[countOFApprovers] = preApprovalsSnapshot[countOFApprovers].approver.displayName;
                    countOFApprovers++;
                }
                countOFApprovers = 0;
                //Storing List of PostApprovers
                while (postApprovalsSnapshot[0].isAutomated == false && countOFApprovers < postApprovalsSnapshot.length) {
                    postapproval_list[countOFApprovers] = postApprovalsSnapshot[countOFApprovers].approver.displayName;
                    countOFApprovers++;
                }
                //Current Status of the Environment
                switch (env.status) {
                    case RM_Contracts.EnvironmentStatus.InProgress:
                        state += 'In Progress';
                        status = 'running';
                        break;
                    case RM_Contracts.EnvironmentStatus.Queued:
                        state += 'Queued';
                        status = 'pending';
                        break;
                    case RM_Contracts.EnvironmentStatus.Succeeded:
                        state += 'Succeeded';
                        status = 'succeeded';
                        break;
                    case RM_Contracts.EnvironmentStatus.Rejected:
                        state += 'Rejected';
                        status = 'failed';
                        break;
                    case RM_Contracts.EnvironmentStatus.Canceled:
                        state += 'Cancelled';
                        status = 'failed';
                        break;
                    case RM_Contracts.EnvironmentStatus.NotStarted:
                        state += 'Not Started';
                        status = 'notStarted';
                        break;
                    case RM_Contracts.EnvironmentStatus.Undefined:
                        state += 'Unknown';
                        break;
                    case RM_Contracts.EnvironmentStatus.Scheduled:
                        state += 'Scheduled';
                        status = 'scheduled';
                        break;
                    default:
                        state += 'Unknown';
                }
                ;
                var preApprovalNodeId = "pre" + env.id;
                var postApprovalNodeId = "pos" + env.id;
                //Determine the status of PreApproval
                if (preapproval_list.length != 0) {
                    var ApprovalsNotReceived = 0;
                    var preDeployApprovals = env.preDeployApprovals;
                    var preDeployApprovalsLength = preDeployApprovals.length - 1;
                    if (preDeployApprovals.length != 0 && env.status != RM_Contracts.EnvironmentStatus.Queued) {
                        var latestAttempt = preDeployApprovals[preDeployApprovalsLength].attempt;
                        for (var preDeployApprover = 0; preDeployApprover < env.preDeployApprovals.length; preDeployApprover++) {
                            if (preDeployApprovals[preDeployApprovalsLength - preDeployApprover].attempt == latestAttempt) {
                                if (typeof env.preDeployApprovals[env.preDeployApprovals.length - 1 - preDeployApprover].approvedBy == "undefined") {
                                    ApprovalsNotReceived++;
                                }
                            }
                            else
                                break;
                        }
                        if (env.preApprovalsSnapshot.approvalOptions.requiredApproverCount == 1 && ApprovalsNotReceived != env.preApprovalsSnapshot.approvals.length) {
                            preApprovalStatus = 'succeeded';
                        }
                        else {
                            if (ApprovalsNotReceived > 0) {
                                preApprovalStatus = 'notStarted';
                                if (status != 'failed')
                                    status = 'pending';
                            }
                            else
                                preApprovalStatus = 'succeeded';
                        }
                    }
                    else
                        preApprovalStatus = 'notStarted';
                }
                //Determine the status of PreApproval
                if (postapproval_list.length != 0) {
                    var ApprovalsNotReceived = 0;
                    var postDeployApprovals = env.postDeployApprovals;
                    var postDeployApprovalsLength = postDeployApprovals.length - 1;
                    if (postDeployApprovals.length != 0) {
                        var latestAttempt = postDeployApprovals[postDeployApprovalsLength].attempt;
                        for (var postDeployApprover = 0; postDeployApprover < postDeployApprovals.length; postDeployApprover++) {
                            if (typeof postDeployApprovals[postDeployApprovalsLength - postDeployApprover].approvedBy == "undefined") {
                                if (postDeployApprovals[postDeployApprovalsLength - postDeployApprover].attempt == latestAttempt)
                                    ApprovalsNotReceived++;
                                else
                                    break;
                            }
                        }
                        if (env.postApprovalsSnapshot.approvalOptions.requiredApproverCount == 1 && ApprovalsNotReceived != env.postApprovalsSnapshot.approvals.length)
                            postApprovalStatus = 'succeeded';
                        else if (ApprovalsNotReceived > 0)
                            postApprovalStatus = 'notStarted';
                        else
                            postApprovalStatus = 'succeeded';
                    }
                    else
                        postApprovalStatus = 'notStarted';
                }
                //Creating Node for preApproval
                var preApprovalNode = $('<div/>', {
                    id: preApprovalNodeId,
                    class: 'preApproval ' + preApprovalStatus,
                });
                //Creating Node for the Current environment in Graph
                var EnvNode = $('<div/>', {
                    id: env.id,
                    class: 'environment ' + status,
                });
                //Creating Node for postApproval
                var postApprovalNode = $('<div/>', {
                    id: postApprovalNodeId,
                    class: 'postApproval ' + postApprovalStatus,
                });
                //Creating a container that stores all the above three nodes
                var current = $('<div/>', {
                    id: environmentName,
                    class: 'container ',
                });
                $('.environments').append(current);
                var doc = document;
                try {
                    if (env.preApprovalsSnapshot.approvals[0].isAutomated == false) {
                        $('#' + environmentName).append(preApprovalNode);
                        doc.getElementById(environmentName).style.borderTopLeftRadius = "10px 10px";
                        doc.getElementById(environmentName).style.borderBottomLeftRadius = "10px 10px";
                    }
                }
                catch (e) {
                    alert('excep_pre' + env.name);
                }
                try {
                    $('#' + environmentName).append(EnvNode);
                }
                catch (e) {
                    alert('excep_envnode' + env.name);
                }
                try {
                    if (env.postApprovalsSnapshot.approvals[0].isAutomated == false) {
                        doc.getElementById(env.id).style.marginRight = "2px";
                        $('#' + environmentName).append(postApprovalNode);
                        doc.getElementById(environmentName).style.borderTopRightRadius = "10px 10px";
                        doc.getElementById(environmentName).style.borderBottomRightRadius = "10px 10px";
                    }
                }
                catch (e) {
                    alert('excep_post' + env.name);
                }
                $('#' + environmentName).append('<span>' + env.name + '</span>');
                //Creating the Object of current Environment
                var releasedEnvironmentObject = new releasedEnvironment(environmentName, env.id, dependencies, preapproval_list, postapproval_list, levelOfEnvironment);
                ReleasedEnvironments[totalNoOfReleasedEnvironments] = releasedEnvironmentObject;
                totalNoOfReleasedEnvironments++;
                //Calculating Maximum No. of Levels
                if (maxLevelNumber < levelOfEnvironment)
                    maxLevelNumber = levelOfEnvironment;
            }); // End of For Each
            CalculateEnvironmentLevel();
            DrawGraph();
            //Hover Function
            $('.environment').hover(function (e) {
                for (var releasedEnvironmentIndex = 0; releasedEnvironmentIndex < ReleasedEnvironments.length; releasedEnvironmentIndex++) {
                    var releasedEnvironment = ReleasedEnvironments[releasedEnvironmentIndex];
                    var EnvironmentInformation = "Environment: ";
                    if (releasedEnvironment.id == this.id) {
                        if (releasedEnvironment.preapproval_list.length != 0) {
                            EnvironmentInformation += releasedEnvironment.name + "<br>" + "PreApprover: ";
                            for (var approver = 0; approver < releasedEnvironment.preapproval_list.length; approver++) {
                                EnvironmentInformation += releasedEnvironment.preapproval_list[approver];
                                if (approver != releasedEnvironment.preapproval_list.length - 1)
                                    EnvironmentInformation += ', ';
                            }
                        }
                        if (releasedEnvironment.postapproval_list.length != 0) {
                            EnvironmentInformation += "<br>" + "PostApprover: ";
                            for (var approver = 0; approver < releasedEnvironment.postapproval_list.length; approver++) {
                                EnvironmentInformation += releasedEnvironment.postapproval_list[approver];
                                if (approver != releasedEnvironment.postapproval_list.length - 1)
                                    EnvironmentInformation += ', ';
                            }
                        }
                        EnvironmentInformation += "<br>";
                        EnvironmentInformation += "Release: " + release_name + "<br>";
                        document.getElementsByClassName('details')[0].innerHTML = EnvironmentInformation;
                        var left = e.pageX + 5, /* nudge to the right, so the pointer is covering the title */ top = e.pageY;
                        if (top + $(".details").height() >= $(window).height()) {
                            top -= $(".details").height();
                        }
                        if (left + $(".details").width() >= $(".environments").width()) {
                            left -= $(".details").width();
                        }
                        // Create and show menu
                        $(".details").css({ top: top, left: left, padding: "5px", display: "inline-block" });
                        break;
                    }
                }
            }, function () {
                $(".details").css({ display: "none" });
                document.getElementsByClassName('details')[0].innerHTML = " ";
            });
            ConnectNodes();
        }); //End of onReleaseChanged
    }); //End of VSS.ready
});
