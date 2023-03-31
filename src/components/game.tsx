import React, { useEffect } from "react";
import { api } from "../utils/api";
import { useState } from "react";
import { default_filters } from "../functions/filter";
import Filters from "./filters";
import { default_score } from "../functions/score";
import nextRound from "../functions/score";
import FormMC from "./form-mc";
import { defaultLink } from "../functions/link";
import Timer from "./timer";
import { default_game, gameOver, startGame_nonLeader } from "../functions/game";
import { startGame, categorySelect } from "../functions/game";
import { default_answerChoices } from "../functions/answer_choices";
import styles from "../styles/game.module.css";
import GameOver from "./game_over";
import { useRouter } from "next/router";
import io from "socket.io-client";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "@socket.io/component-emitter";
//@ts-ignore
let socket: Socket<DefaultEventsMap, DefaultEventsMap>;

export default function Game() {
    const [isLeader, setIsLeader] = useState(false);

    const [game, setGame] = useState(default_game);
    const [filter, setFilter] = useState(default_filters);
    const [link, setLink] = useState(defaultLink);
    const [score, setScore] = useState(default_score);
    const [answerChoices, setAnswerChoices] = useState(default_answerChoices);
    const [socketConnect, setSocketConnect] = useState(true);

    const numberOfRounds = 10;

    const router = useRouter();
    const { pid } = router.query;

    useEffect(() => {
        setSocketConnect((newestSocketConnectValue) => {
            if (!newestSocketConnectValue) return false;
            console.log("socket running");
            fetch("/api/socket").finally(() => {
                //@ts-ignore
                socket = io();

                let localLeader = false;

                socket.on("connect", () => {
                    console.log(`connect on ${pid}`);
                    socket.emit("pid", pid);
                });

                socket.on("disconnect", () => {
                    console.log("disconnect");
                });

                socket.on("become leader", () => {
                    console.log("become leader");
                    setIsLeader(true);
                    localLeader = true;
                });

                socket.on("a user has joined this room", () => {
                    console.log("a user has joined this room");
                });

                socket.on("pull filter", (filter) => {
                    if (!localLeader) {
                        console.log("filter pulled");
                        setFilter(filter);
                    }
                });

                socket.on("pull answer choices", (answerChoices) => {
                    if (!localLeader) {
                        console.log("answer choices pulled");
                        setAnswerChoices(answerChoices);
                    }
                });

                socket.on("pull game state", (game_server) => {
                    if (!localLeader) {
                        console.log("game state pulled");
                        setGame(game_server);

                        if (!game_server.game_over) {
                            startGame_nonLeader(score, setScore);
                        }
                    }
                });
            });

            return false;
        });
    }, []);

    //filter change event
    useEffect(() => {
        if (isLeader) {
            console.log("post filter");
            socket.emit("post filter", pid, filter);
        }
    }, [filter]);

    //filter select event
    useEffect(() => {
        if (isLeader) {
            console.log("post game state");
            socket.emit("post game state", pid, game);
        }
    }, [game]);

    //set game_over
    useEffect(() => {
        if (score.round > numberOfRounds) {
            gameOver(setGame);
        }
    }, [score.round]);

    //get a new link from data

    const linkTest = api.example.getLink.useQuery(
        { fetch: link.fetch, category: link.category },
        {
            refetchOnWindowFocus: false,

            onSuccess(data) {
                if (isLeader) {
                    setAnswerChoices({
                        mainArticle: data.mainArticle,
                        subArticle: data.subArticle,
                        correct: data.subArticleAnswer,
                        incorrect: data.mainArticleAnswers,
                    });

                    console.log("post answer choices");
                    socket.emit("post answer choices", pid, {
                        mainArticle: data.mainArticle,
                        subArticle: data.subArticle,
                        correct: data.subArticleAnswer,
                        incorrect: data.mainArticleAnswers,
                    });
                }
            },
        }
    );

    //reset article on new round before http request
    useEffect(() => {
        setAnswerChoices(default_answerChoices);
    }, [score.round]);

    //handle submissions
    useEffect(() => {
        if (score.submission !== "waiting") {
            const correctness = score.submission == "correct" ? true : false;

            setScore({
                ...score,
                correct_answer: correctness,
                round_over: true,
            });
        }
    }, [score.submission]);

    return (
        <>
            {/* category filters */}
            {game.filter_select && (
                <>
                    <div>
                        <h3>Category Select</h3>
                    </div>

                    <div>
                        <Filters
                            setFilter={setFilter}
                            filter={filter}
                            isLeader={isLeader}
                        />
                    </div>
                    <div className={styles.verticalPadding}></div>
                    <button
                        disabled={!isLeader}
                        onClick={() =>
                            startGame(
                                score,
                                setScore,
                                link,
                                setLink,
                                filter,
                                game,
                                setGame
                            )
                        }
                    >
                        Start Game
                    </button>
                </>
            )}

            {/* game rounds */}
            {!game.filter_select && !game.game_over && (
                <>
                    <div>
                        <h3>Choose the link NOT found in the Wiki article</h3>
                    </div>
                    <div>Round: {score.round}</div>
                    <div>Score: {score.score}</div>
                    <div>Current Streak: {score.streak}</div>

                    <div className={styles.verticalPadding}></div>

                    <div>
                        Category:{" "}
                        {answerChoices.mainArticle != ""
                            ? link.category
                            : link.category}
                    </div>
                    <div>Wiki Article: {answerChoices.mainArticle}</div>

                    <div>
                        <Timer
                            round={score.round}
                            score={score}
                            setScore={setScore}
                        />
                    </div>

                    {/* submission input */}
                    <div>
                        <FormMC
                            setScore={setScore}
                            score={score}
                            correct_anchors={answerChoices.incorrect}
                            incorrect_anchor={answerChoices.correct}
                            mainArticle={answerChoices.mainArticle}
                            subArticle={answerChoices.subArticle}
                        />
                    </div>

                    <div className={styles.verticalPadding}></div>

                    {score.round_over && (
                        <div>
                            <button
                                onClick={() =>
                                    nextRound(
                                        score,
                                        setScore,
                                        link,
                                        setLink,
                                        filter
                                    )
                                }
                            >
                                New Round
                            </button>
                            &nbsp; &nbsp;
                            <button
                                onClick={() =>
                                    categorySelect(setScore, game, setGame)
                                }
                            >
                                Category Select
                            </button>
                        </div>
                    )}

                    {/* answers for cheating

                    <div>
                        (possible answers): {answerChoices.incorrect.join(", ")}
                    </div> */}
                </>
            )}

            {/* game end */}
            {game.game_over && (
                <>
                    <GameOver
                        score={score}
                        game={game}
                        setGame={setGame}
                        setScore={setScore}
                        link={link}
                        setLink={setLink}
                        filter={filter}
                    />
                </>
            )}
        </>
    );
}
