import { relations } from 'drizzle-orm';
import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import type { WritingEvaluation } from '../types/learning.ts';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  preferredHskLevel: integer('preferred_hsk_level').notNull().default(2),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const writingSubmissions = pgTable('writing_submissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  hskLevel: integer('hsk_level').notNull(),
  assignmentPrompt: text('assignment_prompt'),
  essay: text('essay').notNull(),
  mode: text('mode').notNull(),
  totalScore: integer('total_score').notNull(),
  maxPossibleScore: integer('max_possible_score').notNull(),
  evaluationJson: jsonb('evaluation_json').$type<WritingEvaluation>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const hskAttempts = pgTable('hsk_attempts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  hskLevel: integer('hsk_level').notNull(),
  skillFocus: text('skill_focus').notNull(),
  titleVi: text('title_vi').notNull(),
  correctCount: integer('correct_count').notNull(),
  totalCount: integer('total_count').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  writingSubmissions: many(writingSubmissions),
  hskAttempts: many(hskAttempts),
}));

export const writingSubmissionsRelations = relations(writingSubmissions, ({ one }) => ({
  author: one(users, {
    fields: [writingSubmissions.userId],
    references: [users.id],
  }),
}));

export const hskAttemptsRelations = relations(hskAttempts, ({ one }) => ({
  learner: one(users, {
    fields: [hskAttempts.userId],
    references: [users.id],
  }),
}));
