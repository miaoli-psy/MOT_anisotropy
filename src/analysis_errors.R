library(lme4)
library(emmeans)
library(tidyverse)
library(mixedpower)


setwd("d:/OneDrive/projects/MOT_anisotropy_code/data_clean/")

data <- read.csv("participants_trials.csv")
data$crowding_axis <- factor(data$crowding_axis, levels = c("tangential", "radial"))  # tangential = reference
data$participant <- factor(data$participant)

# age

df_check <- data %>% 
  group_by(participant, age, female) %>% 
  tally()

# mean age == 24.2 years
mean(df_check$age)


# descriptives

# 4.24 of 5 targets per trial
mean(data$n_hits) 

# 0.847 of selections correct
mean(data$n_hits) / 5 

# arrange data
data_by_participants <- data %>% 
  group_by(
    participant,
    crowding_axis
  ) %>% 
  summarise(
    n = n(),
    n_errors.mean = mean(n_errors),
    n_errors.sd = sd(n_errors)
  )

data_across_participants <- data_by_participants %>% 
  group_by(
    crowding_axis
  ) %>% 
  summarise(
    avg_n_errors = mean(n_errors.mean),
    avg_n_errors.sd = sd(n_errors.mean),
    n = n()
  ) %>% 
  mutate(
    sem = avg_n_errors.sd/sqrt(n),
    ci = sem * qt((1 - 0.05) / 2 + .5, n - 1)
  )


# reprot CI

data_across_participants <- data_across_participants %>%
  mutate(ci_lower = avg_n_errors - ci,
         ci_upper = avg_n_errors + ci)

# ---------GLMM------------------
# "cbind(n_hits, n_errors)" = the outcome is 
# "n_hits correct out of 5 selections"

contrasts(data$crowding_axis) <- matrix(c(-0.5, 0.5), ncol = 1)

levels(data$crowding_axis)

m1 <- glmer(cbind(n_hits, n_errors) ~ crowding_axis + (1| participant),
            data = data, family = binomial)
summary(m1)

sjPlot::tab_model(
  m1,
  p.style = 'scientific_stars',
  show.se = T,
  show.stat = T,
  digits = 3
) 

emmeans(m1, ~ crowding_axis, type = "response")
emmeans(m1, pairwise ~ crowding_axis, type = "response")

#----participant-level analysis
data2 <- data_by_participants %>% 
  select(participant, crowding_axis, n_errors.mean) %>%
  pivot_wider(names_from = crowding_axis, values_from = n_errors.mean)


#t(23) = 3.61, p = .001
# Cohen's dz = 0.74
# 19 of 24 

t.test(data2$tangential, data2$radial, paired = TRUE) 

dif <- data2$tangential - data2$radial
mean(dif) / sd(dif)                             
sum(dif > 0)      

#---------------power simulation------------------

# safeguard effect size: 85% of the observed slope (Perugini et al., 2014)
sesoi <- c(fixef(m1)[1], fixef(m1)[2] * 0.85)

data$participant_id <- as.numeric(factor(data$participant))

m1_power <- glmer(cbind(n_hits, n_errors) ~ crowding_axis + (1 | participant_id),
                data = data, family = binomial)          

power <- mixedpower(model = m1_power, data = data,
                  fixed_effects  = c("crowding_axis"),
                  simvar         = "participant_id",
                  steps          = c(8, 10, 12, 15, 20, 24), 
                  critical_value = 1.96, n_sim = 1000,
                  SESOI = sesoi,
                  databased = TRUE)

power


#observed power

lambda <- fixef(m1)["crowding_axis1"] / sqrt(diag(vcov(m1)))["crowding_axis1"]
pnorm(lambda - 1.96) + pnorm(-lambda - 1.96)     # 0.916
