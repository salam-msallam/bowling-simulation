import { createBowlingApp } from "/src/app/createBowlingApp.js";

// ============================================================
// مسؤولية العضو 1: نقطة تشغيل التطبيق
// ركز هنا فقط لفهم كيف يبدأ المشروع. التفاصيل موزعة في src/app وsrc/scene وsrc/systems.
// ============================================================

// main.js بقي نقطة تشغيل فقط: ينشئ التطبيق ويصدّر أوامر التحكم لمن يحتاجها خارجياً.
const app = createBowlingApp();
app.start();

export const launchBall = app.launchBall;
export const stopSimulation = app.stopSimulation;
export const resetSimulation = app.resetSimulation;
export const newFrame = app.newFrame;
export const getPhysicsState = app.getPhysicsState;
