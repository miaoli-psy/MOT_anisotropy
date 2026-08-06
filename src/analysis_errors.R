library(lme4)
library(emmeans)
library(tidyverse)
library(mixedpower)

library(dplyr)
library(tidyr)
library(ggplot2)
library(patchwork)
library(ggdist)



setwd("d:/OneDrive/projects/MOT_anisotropy_code/data_clean/")

data <- read.csv("participants_trials.csv")
data$crowding_axis <- factor(data$crowding_axis, levels = c("strong", "weak"))  # tangential(strong) = reference
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

# ---- everything on the ERROR scale --------------------------------------
# the model is fitted to hits out of 5; expected errors = 5 * (1 - p).
# the transform is monotonic decreasing, so CI bounds swap.

emm_err <- as.data.frame(emmeans(m1, ~ crowding_axis, type = "response")) %>%
  mutate(
    err       = 5 * (1 - prob),
    err_lower = 5 * (1 - asymp.UCL),
    err_upper = 5 * (1 - asymp.LCL)
  )

emm_err   # model-estimated errors per trial, by condition

# odds ratio for an ERROR (strong vs weak) = OR for a hit (weak vs strong)
exp(fixef(m1)["crowding_axis1"])

#----participant-level analysis
data2 <- data_by_participants %>% 
  select(participant, crowding_axis, n_errors.mean) %>%
  pivot_wider(names_from = crowding_axis, values_from = n_errors.mean)


#t(23) = 3.61, p = .001
# Cohen's dz = 0.74
# 19 of 24 

t.test(data2$strong, data2$weak, paired = TRUE) 

dif <- data2$strong - data2$weak
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
pnorm(lambda - 1.96) + pnorm(-lambda - 1.96)     # dz = 0.916



#--------------plots--------------------------

my_plot_theme <- theme(
  axis.title.x = element_text(color = "black", size = 14, face = "bold", margin = margin(t = 10)),
  axis.title.y = element_text(color = "black", size = 14, face = "bold", margin = margin(r = 10)),
  axis.text.x  = element_text(size = 12, face = "bold", color = "black"),
  axis.text.y  = element_text(size = 12, face = "bold", color = "black"),
  axis.line    = element_line(colour = "black", linewidth = 0.8),
  panel.border     = element_blank(),
  panel.grid.major = element_blank(),
  panel.grid.minor = element_blank(),
  panel.background = element_blank(),
  strip.text       = element_text(size = 12, face = "bold"),
  legend.title     = element_text(size = 12, face = "bold"),
  legend.text      = element_text(size = 10),
  plot.title       = element_text(size = 16, face = "bold"),
  plot.subtitle    = element_text(size = 12, color = "grey30"),
  panel.spacing    = unit(1.5, "lines")
)

zone_cols <- c("weak" = "#1a80bb", "strong" = "#f1a226")


# p error rates

p_errors <- ggplot() +
  
  geom_line(
    data = data_by_participants,
    aes(x = crowding_axis,
        y = n_errors.mean,
        group = participant),
    alpha = 0.15,
    color = "grey40",
    linewidth = 0.4
  ) +
  
  geom_point(
    data = data_by_participants,
    aes(x = crowding_axis,
        y = n_errors.mean,
        color = crowding_axis),
    alpha = 0.25,
    size = 2
  ) +
  
  geom_line(
    data = data_across_participants,
    aes(x = crowding_axis,
        y = avg_n_errors,
        group = 1),
    color = "black",
    linewidth = 1,
    alpha = 0.5
  ) +
  
  geom_point(
    data = data_across_participants,
    aes(x = crowding_axis,
        y = avg_n_errors,
        color = crowding_axis),
    size = 4,
    alpha = 0.8
  ) +
  
  geom_errorbar(
    data = data_across_participants,
    aes(x = crowding_axis,
        ymin = ci_lower,
        ymax = ci_upper,
        color = crowding_axis),
    width = 0.0,
    linewidth = 1
  ) +
  
  scale_y_continuous(breaks = c(0, 0.5, 1, 1.5, 2), limits = c(-0, 2)) +


  scale_color_manual(values = zone_cols) +

  labs(x = "Interference",
       y = "Errors per trial") +

  my_plot_theme +

  theme(legend.position = "none")

p_errors


# model-estimated ERRORS per trial (emmeans, back-transformed to the count scale)

p_model <- ggplot(data = emm_err,
                  aes(x = crowding_axis,
                      y = err,
                      color = crowding_axis)) +

  geom_line(aes(group = 1),
            color = "black",
            linewidth = 1,
            alpha = 0.5) +

  geom_point(size = 4,
             alpha = 0.8) +

  geom_errorbar(
    aes(ymin = err_lower,
        ymax = err_upper),
    width = 0.0,
    linewidth = 1
  ) +

  scale_y_continuous(breaks = seq(0.2, 1.2, by = 0.2)) +

  coord_cartesian(ylim = c(0.3, 1.1)) +

  scale_color_manual(values = zone_cols) +

  labs(x = "Interference",
       y = "Estimated errors per trial") +

  my_plot_theme +

  theme(legend.position = "none")

p_model


# combine 2
main_plot <- (p_errors | p_model) +
  plot_layout(widths = c(1,  1)) +
  plot_annotation(tag_levels = "A") &
  theme(plot.tag = element_text(size = 16, face = "bold"))

main_plot


ggsave(
  filename = "error_plot.svg",
  plot = main_plot,
  width = 7,
  height = 3.6,
  units = "in"
)


