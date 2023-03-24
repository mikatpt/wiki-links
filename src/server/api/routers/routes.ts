import { z } from "zod";
import pickRandomAnchors from "../../../functions/pick_random_anchors";
import checkUnique from "../../../functions/unique_arr";

import { createTRPCRouter, publicProcedure } from "../trpc";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const exampleRouter = createTRPCRouter({
    getLink: publicProcedure
        .input(
            z.object({
                fetch: z.boolean(),
                category: z.string(),
            })
        )
        .query(async ({ input }) => {
            const fileName: string = `${input.category}.json`;

            const category: object = await import(`../../../data/${fileName}`);

            await new Promise((r) => setTimeout(r, 50));

            const articles = Object.keys(category).filter((e) => e !== "error");

            const mainArticle = articles[
                Math.floor(articles.length * Math.random())
            ] as string;

            // console.log("Main Article: ", mainArticle, category[mainArticle]);

            //@ts-ignore
            const mainArticleLinks = category[mainArticle].anchors as string[];

            const articlesWithoutMain = articles.filter(
                (e) => e !== mainArticle
            );

            let subArticle = articlesWithoutMain[
                Math.floor(articlesWithoutMain.length * Math.random())
            ] as string;
            //@ts-ignore
            let subArticleLinks = category[subArticle].anchors as string[];

            while (!checkUnique(mainArticleLinks, subArticleLinks)) {
                // console.log(
                //     "Unique?: ",
                //     checkUnique(mainArticleLinks, subArticleLinks)
                // );

                subArticle = articlesWithoutMain[
                    Math.floor(articlesWithoutMain.length * Math.random())
                ] as string;
                //@ts-ignore
                subArticleLinks = category[subArticle].anchors as string[];
            }

            // console.log("Sub Article: ", subArticle, category[subArticle]);

            // console.log(
            //     "Unique?: ",
            //     checkUnique(mainArticleLinks, subArticleLinks)
            // );

            const mainArticleAnswers = pickRandomAnchors(mainArticleLinks, 3);

            const subArticleAnswer = subArticleLinks[
                Math.floor(subArticleLinks.length * Math.random())
            ] as string;

            return {
                mainArticle,
                mainArticleAnswers,
                subArticle,
                subArticleAnswer,
            };
        }),
    postSave: publicProcedure
        .input(
            z.object({
                score: z.number(),
                categories: z.array(z.string()),
                date: z.date(),
                name: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {}),
});
