import Joi from "joi";

export const createSubscriptionSchema = Joi.object({
  planType: Joi.string().valid("1M", "3M", "6M", "12M").required(),
});
